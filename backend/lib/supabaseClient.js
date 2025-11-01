// ============================================================
// SUPABASE CLIENT (HTTPS)
// For accessing Supabase via REST API instead of direct Postgres
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SUPABASE] Not fully configured - some features may not work');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

if (supabase) {
  console.log('[SUPABASE] Client initialized successfully');
} else {
  console.warn('[SUPABASE] Client not initialized - missing environment variables');
}

module.exports = { supabase };
