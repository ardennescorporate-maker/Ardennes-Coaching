"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { makeGroupCode, normaliseCode } from "@/lib/domain/codes";
import { checkAnnouncement } from "@/lib/domain/moderation";
import { allow } from "@/lib/server/ratelimit";
import { notify } from "@/lib/server/gamify";

const GROUP_TYPES = ["Friend group", "Private study group", "Class group", "Competition team"] as const;
type R = { error?: string; groupId?: string };

async function isMember(groupId: string, userId: string) {
  const { data } = await adminClient().from("group_members").select("user_id").match({ group_id: groupId, user_id: userId }).maybeSingle();
  return Boolean(data);
}

export async function createGroupAction(input: { name: string; type: string; goal: number }): Promise<R> {
  const v = await getViewer();
  if (!v) return { error: "Please log in again." };
  const p = z.object({ name: z.string().trim().min(1).max(40), type: z.enum(GROUP_TYPES), goal: z.number().int().min(1).max(500) }).safeParse(input);
  if (!p.success) return { error: "Give your group a name (up to 40 characters)." };
  if (!(await allow(`group-create:${v.userId}`, 5, 86400))) return { error: "You've created a few groups today. Try again tomorrow." };
  const db = adminClient();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await db.from("groups").insert({ name: p.data.name, type: p.data.type, goal_hours: p.data.goal, code: makeGroupCode(p.data.name), created_by: v.userId }).select("id").single();
    if (data) {
      await db.from("group_members").insert({ group_id: data.id, user_id: v.userId, role: "owner" });
      revalidatePath("/groups");
      return { groupId: data.id };
    }
    if (error?.code !== "23505") break;
  }
  return { error: "We couldn't create that group. Try again." };
}

export async function joinGroupAction(code: string): Promise<R> {
  const v = await getViewer();
  if (!v) return { error: "Please log in again." };
  if (!(await allow(`group-join:${v.userId}`, 10, 600))) return { error: "Too many tries. Wait a few minutes." };
  const db = adminClient();
  const { data: g } = await db.from("groups").select("id, name").eq("code", normaliseCode(code)).maybeSingle();
  if (!g) return { error: "That group code isn't right. Check it with your friend or teacher." };
  if (await isMember(g.id, v.userId)) return { groupId: g.id };
  const { count } = await db.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", g.id);
  if ((count ?? 0) >= 200) return { error: "This group is full." };
  await db.from("group_members").insert({ group_id: g.id, user_id: v.userId });
  const { data: others } = await db.from("group_members").select("user_id").eq("group_id", g.id).neq("user_id", v.userId).limit(200);
  for (const o of others ?? []) await notify(o.user_id, "competition", `${v.profile.username} joined ${g.name}`, "New competition on the leaderboard!", `/groups?g=${g.id}`);
  revalidatePath("/groups");
  return { groupId: g.id };
}

export async function leaveGroupAction(groupId: string) {
  const v = await getViewer();
  if (!v) return;
  await adminClient().from("group_members").delete().match({ group_id: groupId, user_id: v.userId });
  revalidatePath("/groups");
}

export async function postAnnouncementAction(groupId: string, body: string): Promise<{ error?: string }> {
  const v = await getViewer();
  if (!v) return { error: "Please log in again." };
  if (!(await isMember(groupId, v.userId))) return { error: "You're not in this group." };
  const problem = checkAnnouncement(body);
  if (problem) return { error: problem };
  if (!(await allow(`announce:${v.userId}`, 10, 3600))) return { error: "You're posting a lot. Take a short break." };
  const db = adminClient();
  await db.from("group_announcements").insert({ group_id: groupId, user_id: v.userId, body: body.trim() });
  const [{ data: g }, { data: members }] = await Promise.all([
    db.from("groups").select("name").eq("id", groupId).single(),
    db.from("group_members").select("user_id").eq("group_id", groupId).neq("user_id", v.userId).limit(200),
  ]);
  for (const m of members ?? []) await notify(m.user_id, "competition", `New announcement in ${g?.name ?? "your group"}`, body.trim().slice(0, 90), `/groups?g=${groupId}`);
  revalidatePath("/groups");
  return {};
}

/** Report an announcement; 3 reports hide it until an admin reviews. */
export async function reportAnnouncementAction(id: string) {
  const v = await getViewer();
  if (!v) return;
  const db = adminClient();
  const { data: a } = await db.from("group_announcements").select("group_id, reports").eq("id", id).single();
  if (!a || !(await isMember(a.group_id, v.userId))) return;
  const { error } = await db.from("announcement_reports").insert({ announcement_id: id, user_id: v.userId });
  if (error) return; // already reported
  const reports = a.reports + 1;
  await db.from("group_announcements").update({ reports, hidden: reports >= 3 }).eq("id", id);
  revalidatePath("/groups");
}
