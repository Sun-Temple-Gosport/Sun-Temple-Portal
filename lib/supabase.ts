import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const globalForSupabase = globalThis as typeof globalThis & {
  supabaseClient?: SupabaseClient;
};

export const supabase =
  globalForSupabase.supabaseClient ??
  createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseClient = supabase;
}