import "server-only";
import { adminClient } from "@/lib/supabase/admin";

/** Fixed-window rate limit backed by Postgres. Returns true when the call is allowed. */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await adminClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true; // fail open rather than locking everyone out
  }
  return data === true;
}
