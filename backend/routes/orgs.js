const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabaseClient');
const { audit } = require('../lib/audit'); // exists per prod lock notes
const supabaseAuth = require('../middleware/supabaseAuth'); // exists

router.use(supabaseAuth);

// GET /api/orgs/mine
router.get('/mine', async (req, res) => {
  const auth_user_id = req.user?.id;
  if (!auth_user_id) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { data, error} = await supabase
    .from('user_org_memberships')
    .select(`
      role,
      organizations ( id, name ),
      user_active_org!left ( org_id )
    `)
    .eq('auth_user_id', auth_user_id);

  if (error) {
    console.error('orgs.mine error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to retrieve organizations.' });
  }

  const activeOrgId = data?.find(o => Array.isArray(o.user_active_org) && o.user_active_org.length > 0)?.user_active_org?.[0]?.org_id;
  const orgs = (data || []).map(o => ({
    id: o.organizations.id,
    name: o.organizations.name,
    role: o.role,
    is_active: o.organizations.id === activeOrgId,
  }));

  return res.json({ ok: true, orgs });
});

// POST /api/orgs
router.post('/', async (req, res) => {
  const auth_user_id = req.user?.id;
  const { name } = req.body || {};
  if (!auth_user_id) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!name || name.length < 3) return res.status(400).json({ ok: false, error: 'Organization name is required.' });

  try {
    // Generate slug from name (lowercase, replace spaces with hyphens, remove special chars)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    const { data: orgRow, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select('id')
      .single();
    if (orgErr) throw orgErr;

    const org_id = orgRow.id;

    const { error: memErr } = await supabase
      .from('user_org_memberships')
      .insert({ org_id, auth_user_id, role: 'owner' });
    if (memErr) throw memErr;

    const { error: activeErr } = await supabase
      .from('user_active_org')
      .upsert({ auth_user_id, org_id }, { onConflict: 'auth_user_id' });
    if (activeErr) throw activeErr;

    // CRITICAL FIX: Ensure audit logging is non-blocking.
    // If audit fails, we should still return 201 success.
    (async () => {
      try {
        await audit?.('org.create', { org_id, user_id: auth_user_id, name });
      } catch (e) {
        console.error('Non-blocking Audit Log Failed:', e.message);
      }
    })();
    
    return res.status(201).json({ ok: true, id: org_id, name, message: 'Organization created and set as active.' });
  } catch (e) {
    // CRITICAL: Log the exact database error message for diagnosis
    console.error('FATAL ORG CREATE ERROR:', JSON.stringify({
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      full: e
    }, null, 2));
    return res.status(500).json({ ok: false, error: e.message || 'Failed to create organization due to server error.' });
  }
});

// POST /api/orgs/:id/activate
router.post('/:id/activate', async (req, res) => {
  const auth_user_id = req.user?.id;
  const org_id = req.params.id;
  if (!auth_user_id) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const { count, error: checkErr } = await supabase
    .from('user_org_memberships')
    .select('id', { count: 'exact' })
    .eq('auth_user_id', auth_user_id)
    .eq('org_id', org_id);

  if (checkErr) {
    console.error('orgs.activate check error:', checkErr);
    return res.status(500).json({ ok: false, error: 'Membership check failed.' });
  }
  if (!count) return res.status(403).json({ ok: false, error: 'Not a member of this organization.' });

  try {
    const { error } = await supabase
      .from('user_active_org')
      .upsert({ auth_user_id, org_id }, { onConflict: 'auth_user_id' });
    if (error) throw error;

    audit?.('org.activate', { org_id, user_id: auth_user_id });
    return res.json({ ok: true, org_id, message: 'Active organization set.' });
  } catch (e) {
    console.error('orgs.activate error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to set active organization.' });
  }
});

module.exports = router;
