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
    const { data: orgRow, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name })
      .select('id')
      .single();
    if (orgErr) throw orgErr;

    const org_id = orgRow.id;

    const { error: memErr } = await supabase
      .from('user_org_memberships')
      .insert({ org_id, auth_user_id, role: 'owner' });
    if (memErr) throw memErr;

    await supabase
      .from('user_active_org')
      .upsert({ auth_user_id, org_id }, { onConflict: 'auth_user_id' });

    audit?.('org.create', { org_id, user_id: auth_user_id, name });
    return res.status(201).json({ ok: true, id: org_id, name, message: 'Organization created and set as active.' });
  } catch (e) {
    console.error('orgs.create error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to create organization.' });
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
