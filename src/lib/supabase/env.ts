export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Cookie that marks "Keep me logged in" as off: auth cookies are then session cookies. */
export const SESSION_ONLY_COOKIE = "sp-session-only";

type CookieOpts = { maxAge?: number; expires?: Date; [k: string]: unknown };
export function sessionOnly<T extends CookieOpts>(opts: T | undefined, on: boolean): T | undefined {
  if (!on || !opts) return opts;
  // Clearing cookies uses maxAge 0; keep that so sign-out still works.
  if (opts.maxAge === 0) return opts;
  const rest = { ...opts };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
