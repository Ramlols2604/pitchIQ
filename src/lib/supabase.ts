import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getSupabaseAdmin() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseBrowser() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(url, key);
}

