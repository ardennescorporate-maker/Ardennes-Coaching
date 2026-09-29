"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { BILLING_ENABLED, checkoutUrl, portalUrl } from "@/lib/server/billing";

export async function pickLaunchPlanAction(plan: "free" | "premium" | "premium_exam") {
  const v = await getViewer();
  if (!v || !["free", "premium", "premium_exam"].includes(plan)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ launch_plan: plan }).eq("id", v.userId);
}

export async function checkoutAction(plan: "premium" | "premium_exam") {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!BILLING_ENABLED) redirect("/plans");
  redirect(await checkoutUrl(v, plan));
}

export async function portalAction() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!BILLING_ENABLED) redirect("/plans");
  redirect(await portalUrl(v));
}
