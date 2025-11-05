// ============================================================
// SUPABASE CLIENT
// ============================================================
// Supabase client for authentication and database access

"use client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Do NOT invent fallbacks at build time; fail fast in console instead.
if (!supabaseUrl) console.error("NEXT_PUBLIC_SUPABASE_URL is missing at runtime");
if (!supabaseAnonKey) console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing at runtime");

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
