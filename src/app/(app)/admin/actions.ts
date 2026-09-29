"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/viewer";
import { makeInviteCode, normaliseCode } from "@/lib/domain/codes";
import { FEEDBACK_PRIORITIES, FEEDBACK_STATUSES } from "@/lib/domain/feedback";
import { XP } from "@/lib/domain/xp";
import { awardXp, bumpCounters, notify } from "@/lib/server/gamify";

// Every action re-checks the admin role on the server.

export async function createCodeAction(input: { prefix: string; limit: number; custom?: string }) {
  const v = await requireAdmin();
  const limit = Math.max(1, Math.min(500, Math.round(input.limit) || 1));
  const db = adminClient();
  const custom = input.custom ? normaliseCode(input.custom) : "";
  if (custom && !/^[A-Z0-9-]{4,32}$/.test(custom)) return { error: "Custom codes use letters, numbers and dashes (4–32)." };
  for (let i = 0; i < 5; i++) {
    const code = custom || makeInviteCode(input.prefix || "PILOT");
    const { error } = await db.from("beta_codes").insert({ code, max_uses: limit, active: true, created_by: v.userId });
    if (!error) {
      revalidatePath("/admin");
      return { code };
    }
    if (custom || error.code !== "23505") return { error: error.code === "23505" ? "That code already exists." : "Couldn't create the code." };
  }
  return { error: "Couldn't create a unique code. Try again." };
}

export async function setCodeActiveAction(id: string, active: boolean) {
  await requireAdmin();
  await adminClient().from("beta_codes").update({ active }).eq("id", id);
  revalidatePath("/admin");
}

export async function removeBetaAccessAction(userId: string) {
  const v = await requireAdmin();
  if (userId === v.userId) return;
  await adminClient().from("profiles").update({ beta_removed_at: new Date().toISOString() }).eq("id", userId);
  revalidatePath("/admin");
}

export async function restoreBetaAccessAction(userId: string) {
  await requireAdmin();
  await adminClient().from("profiles").update({ beta_removed_at: null }).eq("id", userId);
  revalidatePath("/admin");
}

export async function announceAction(body: string) {
  const v = await requireAdmin();
  const text = body.trim();
  if (!text || text.length > 1000) return { error: "Write an announcement (up to 1000 characters)." };
  const db = adminClient();
  await db.from("announcements").insert({ body: text, created_by: v.userId });
  const { data: users } = await db.from("profiles").select("id").not("beta_joined_at", "is", null).is("beta_removed_at", null);
  const rows = (users ?? []).map((u) => ({ user_id: u.id, category: "beta", title: "New beta announcement", body: text.slice(0, 140), href: "/feedback" }));
  for (let i = 0; i < rows.length; i += 500) await db.from("notifications").insert(rows.slice(i, i + 500));
  revalidatePath("/admin");
  return { sent: rows.length };
}

export async function updateFeedbackAction(id: string, patch: { status?: string; priority?: string }) {
  await requireAdmin();
  const p = z.object({ status: z.enum(FEEDBACK_STATUSES).optional(), priority: z.enum(FEEDBACK_PRIORITIES).optional() }).safeParse(patch);
  if (!p.success) return;
  const db = adminClient();
  const { data: before } = await db.from("feedback").select("user_id, category, status").eq("id", id).single();
  await db.from("feedback").update(p.data).eq("id", id);
  if (before?.user_id && p.data.status && p.data.status !== before.status) {
    const kind = before.category === "Bug report" ? "bug report" : `${before.category.toLowerCase()} report`;
    await notify(before.user_id, "beta", `Your ${kind} is now marked ${p.data.status}.`, "Thanks for helping improve StudyPilot.", "/feedback");
  }
  revalidatePath("/admin");
}

/** Anti-cheat review of a flagged study session. */
export async function reviewSessionAction(id: string, approve: boolean) {
  await requireAdmin();
  const db = adminClient();
  const { data: s } = await db.from("study_sessions").select("user_id, minutes, review_status").eq("id", id).single();
  if (!s || s.review_status !== "pending") return;
  await db.from("study_sessions").update({ review_status: approve ? "approved" : "rejected", verified: approve, flagged: !approve }).eq("id", id);
  if (approve) {
    await bumpCounters(s.user_id, { minutes: s.minutes });
    await awardXp(s.user_id, XP.studySession(s.minutes), "study_session", { ref: `review:${id}` });
    await notify(s.user_id, "study", "Your study session was approved", `${s.minutes} minutes added. Keep it up!`, "/home");
  } else {
    await notify(s.user_id, "study", "A study session wasn't approved", "It didn't meet the evidence rules. Upload clear photos of your own work.", "/home");
  }
  revalidatePath("/admin");
}

export async function evidenceUrlAction(path: string) {
  await requireAdmin();
  const { data } = await adminClient().storage.from("evidence").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function moderateAnnouncementAction(id: string, keep: boolean) {
  await requireAdmin();
  const db = adminClient();
  if (keep) await db.from("group_announcements").update({ hidden: false, reports: 0 }).eq("id", id);
  else await db.from("group_announcements").delete().eq("id", id);
  revalidatePath("/admin");
}
