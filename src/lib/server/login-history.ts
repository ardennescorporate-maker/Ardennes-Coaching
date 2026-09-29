import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { clientIp, deviceLabel } from "@/lib/request";

export async function recordLogin(userId: string, method: string) {
  const [ip, device] = await Promise.all([clientIp(), deviceLabel()]);
  const { error } = await adminClient().from("login_history").insert({ user_id: userId, method, ip, device });
  if (error) console.error("login history", error.message);
}
