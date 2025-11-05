// ============================================================
// SUPABASE CLIENT (HTTPS)
// For accessing Supabase via REST API instead of direct Postgres
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Strict validation of required envs
const isUrlPresent = !!SB_URL;
const isKeyPresent = !!SB_KEY;

console.log('[SUPABASE] Environment Check:', {
  'URL Present': isUrlPresent,
  'Service Key Present': isKeyPresent,
  'URL Value': SB_URL ? `${SB_URL.substring(0, 30)}...` : 'MISSING',
  'Key Value': SB_KEY ? `${SB_KEY.substring(0, 20)}...` : 'MISSING'
});

if (!isUrlPresent || !isKeyPresent) {
  console.error('[SUPABASE] FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Supabase client initialization failed - missing required environment variables');
}

const supabase = createClient(SB_URL, SB_KEY);

console.log('[SUPABASE] Client initialized successfully');

module.exports = { supabase };
