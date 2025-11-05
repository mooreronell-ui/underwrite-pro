// ============================================================
// SUPABASE CLIENT
// ============================================================
// Supabase client for authentication and database access

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client with fallback values for build time
// At runtime, the actual values will be used
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));
}
