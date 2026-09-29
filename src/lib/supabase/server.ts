import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_ONLY_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL, sessionOnly } from "./env";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createClient(opts: { sessionOnly?: boolean } = {}) {
  const store = await cookies();
  const short = opts.sessionOnly ?? store.get(SESSION_ONLY_COOKIE)?.value === "1";
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, sessionOnly(options, short)));
        } catch {
          // Called from a Server Component: the proxy refreshes cookies instead.
        }
      },
    },
  });
}
