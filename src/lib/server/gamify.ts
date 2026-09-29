import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { ACHIEVEMENTS, type AchievementId } from "@/lib/content/achievements";

export type Badge = { id: string; title: string };
export type Reward = { awarded: number; xp: number; level: number; leveledUp: boolean; streak: number; badges: Badge[] };

/**
 * Awards XP through the database (clamped, deduped by ref, updates streak and milestones),
 * then checks badge rules. Callers must compute `amount` from server-side facts only.
 */
export async function awardXp(userId: string, amount: number, reason: string, opts: { ref?: string; study?: boolean } = {}): Promise<Reward> {
  const db = adminClient();
  const { data, error } = await db.rpc("award_xp", { p_user: userId, p_amount: Math.round(amount), p_reason: reason, p_ref: opts.ref ?? null, p_study: opts.study ?? true });
  if (error) throw new Error(`award_xp: ${error.message}`);
  const r = data as { awarded: number; xp: number; level: number; leveledUp: boolean; streak: number };
  const badges = await checkAchievements(userId);
  // Level-10 and 7-day badges are granted inside award_xp; surface them too.
  if (r.leveledUp && r.level >= 10) badges.push(...(await recentlyGranted(userId, ["cruising_altitude"])));
  if (r.streak === 7) badges.push(...(await recentlyGranted(userId, ["streak_7"])));
  return { ...r, badges: dedupe(badges) };
}

async function recentlyGranted(userId: string, ids: AchievementId[]): Promise<Badge[]> {
  const { data } = await adminClient()
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .in("achievement_id", ids)
    .gte("unlocked_at", new Date(Date.now() - 15_000).toISOString());
  return (data ?? []).map((r) => toBadge(r.achievement_id));
}

function toBadge(id: string): Badge {
  return { id, title: ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id };
}
function dedupe(b: Badge[]) {
  return [...new Map(b.map((x) => [x.id, x])).values()];
}

export async function grant(userId: string, id: AchievementId): Promise<Badge | null> {
  const { data } = await adminClient().rpc("grant_achievement", { p_user: userId, p_id: id });
  return data === true ? toBadge(id) : null;
}

/** Checks count-based badges. Returns the ones newly unlocked. */
export async function checkAchievements(userId: string): Promise<Badge[]> {
  const db = adminClient();
  const [{ data: p }, { data: have }] = await Promise.all([
    db.from("profiles").select("study_minutes, questions_answered, papers_completed").eq("id", userId).single(),
    db.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  if (!p) return [];
  const owned = new Set((have ?? []).map((r) => r.achievement_id));
  const out: Badge[] = [];
  const tryGrant = async (id: AchievementId, cond: () => Promise<boolean> | boolean) => {
    if (owned.has(id)) return;
    if (await cond()) {
      const b = await grant(userId, id);
      if (b) out.push(b);
    }
  };
  await tryGrant("first_session", async () => {
    const { count } = await db.from("study_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("verified", true);
    return (count ?? 0) > 0;
  });
  await tryGrant("questions_100", () => p.questions_answered >= 100);
  await tryGrant("hours_100", () => p.study_minutes >= 6000);
  await tryGrant("first_paper", () => p.papers_completed >= 1);
  await tryGrant("exam_champion", async () => {
    const { count } = await db.from("papers").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "marked").gte("pct", 90);
    return (count ?? 0) > 0;
  });
  await tryGrant("card_shark", async () => {
    const { data } = await db.from("cards").select("deck_id").eq("user_id", userId);
    const counts = new Map<string, number>();
    for (const r of data ?? []) counts.set(r.deck_id, (counts.get(r.deck_id) ?? 0) + 1);
    return [...counts.values()].some((n) => n >= 20);
  });
  await tryGrant("bug_hunter", async () => {
    const { count } = await db.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", userId);
    return (count ?? 0) > 0;
  });
  return out;
}

/** Increments protected profile counters. */
export async function bumpCounters(userId: string, d: { questions?: number; correct?: number; minutes?: number; papers?: number }) {
  const db = adminClient();
  const { data: p } = await db.from("profiles").select("questions_answered, questions_correct, study_minutes, papers_completed").eq("id", userId).single();
  if (!p) return;
  await db
    .from("profiles")
    .update({
      questions_answered: p.questions_answered + Math.max(0, d.questions ?? 0),
      questions_correct: p.questions_correct + Math.max(0, Math.min(d.correct ?? 0, d.questions ?? 0)),
      study_minutes: p.study_minutes + Math.max(0, d.minutes ?? 0),
      papers_completed: p.papers_completed + Math.max(0, d.papers ?? 0),
    })
    .eq("id", userId);
}

/** Records a missed topic for the planner, progress page and Pip's tips. */
export async function addWeakTopics(userId: string, subject: string, topics: string[]) {
  const db = adminClient();
  for (const topic of topics.slice(0, 8)) {
    const t = topic.trim().slice(0, 120);
    if (!t) continue;
    const { data } = await db.from("weak_topics").select("misses").match({ user_id: userId, subject, topic: t }).maybeSingle();
    if (data) await db.from("weak_topics").update({ misses: data.misses + 1, updated_at: new Date().toISOString() }).match({ user_id: userId, subject, topic: t });
    else await db.from("weak_topics").insert({ user_id: userId, subject, topic: t });
  }
}

export async function notify(userId: string, category: "study" | "motivation" | "competition" | "ai" | "beta", title: string, body?: string, href?: string, dedupe?: string) {
  await adminClient().rpc("notify", { p_user: userId, p_category: category, p_title: title, p_body: body ?? null, p_href: href ?? null, p_dedupe: dedupe ?? null });
}
