const { supabase } = require('../lib/supabaseClient');

module.exports = async function orgContext(req, _res, next) {
  try {
    const auth_user_id = req.user?.id;
    if (!auth_user_id) return next();

    const { data, error } = await supabase
      .from('user_active_org')
      .select('org_id')
      .eq('auth_user_id', auth_user_id)
      .single();

    if (!error && data?.org_id) req.orgId = data.org_id;
  } catch (e) {
    console.warn('[orgContext] non-blocking:', e?.message);
  }
  return next();
};
