import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped schema; rows are validated where used
type AdminClient = SupabaseClient<any, "public", "public", any, any>;
let cached: AdminClient | null = null;

/** Service-role client. Bypasses RLS — only use after checking the caller on the server. */
export function adminClient(): AdminClient {
  if (!cached) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    cached = createSupabaseClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return cached;
}
