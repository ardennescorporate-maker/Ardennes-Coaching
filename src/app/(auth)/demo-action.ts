"use server";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMAIL, ensureDemo } from "@/lib/demo/seed";
import { allow } from "@/lib/server/ratelimit";
import { clientIp } from "@/lib/request";

/** Signs in as the shared demo student (dev/beta only). */
export async function demoLoginAction() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") redirect("/login");
  if (!(await allow(`demo:${await clientIp()}`, 20, 3600))) redirect("/login?error=demo");
  try {
    await ensureDemo();
    const { data, error } = await adminClient().auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
    if (error || !data.properties?.hashed_token) throw error ?? new Error("no token");
    const supabase = await createClient({ sessionOnly: true });
    const res = await supabase.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" });
    if (res.error) throw res.error;
  } catch (e) {
    console.error("demo login", e);
    redirect("/login?error=demo");
  }
  redirect("/home");
}
