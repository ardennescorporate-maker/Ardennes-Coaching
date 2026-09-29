import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, daysBetween, startOfWeek } from "@/lib/domain/dates";
import { allowedByFrequency, EXAM_COUNTDOWNS, localParts } from "@/lib/domain/schedule";
import { planWeek, type PlanHours } from "@/lib/domain/planner";
import { XP } from "@/lib/domain/xp";
import { awardXp, grant, notify } from "./gamify";
import { deliverPending } from "./delivery";

const MOTIVATION = [
  "Small steps every day beat cramming. Let's take off!",
  "Mistakes are just practice with feedback. Keep going!",
  "Ten focused minutes still counts. Start small today.",
  "You're building something big, one session at a time.",
  "Future you will thank you for today's study. Smooth flying!",
];

type User = { id: string; username: string | null; timezone: string; notif_prefs: { reminderTime?: string; frequency?: "low" | "normal" | "high" } | null; streak: number; last_study_date: string | null; subjects: string[]; plan_hours: PlanHours };

/** Daily notifications for one user (deduped per day, so safe to run more than once). */
export async function dailyForUser(u: User, today: string) {
  const db = adminClient();
  const freq = u.notif_prefs?.frequency ?? "normal";
  const k = (s: string) => `${s}:${today}`;

  if (allowedByFrequency(freq, "streak") && u.streak > 0 && u.last_study_date === addDays(today, -1)) {
    await notify(u.id, "study", `Your ${u.streak}-day streak is at risk`, "One session today keeps it alive.", "/home", k("streak-risk"));
  }

  const [{ data: exams }, { data: homework }, { data: weak }] = await Promise.all([
    db.from("exams").select("name, subject, date").eq("user_id", u.id).gte("date", today),
    db.from("homework").select("id, task, subject, due, done_at").eq("user_id", u.id).is("done_at", null),
    db.from("weak_topics").select("subject, topic, misses").eq("user_id", u.id).order("misses", { ascending: false }).limit(5),
  ]);
  if (allowedByFrequency(freq, "exam")) {
    for (const e of exams ?? []) {
      const d = daysBetween(today, e.date);
      if ((EXAM_COUNTDOWNS as readonly number[]).includes(d)) {
        await notify(u.id, "study", `${e.name} is ${d} ${d === 1 ? "day" : "days"} away.`, d <= 7 ? "A timed practice paper would help most." : "Pip has planned your revision around it.", "/planner", `exam:${e.name}:${d}:${e.date}`);
      }
    }
  }
  if (allowedByFrequency(freq, "planned")) {
    const plan = planWeek({
      today,
      hours: u.plan_hours,
      subjects: u.subjects,
      exams: (exams ?? []).map((e) => ({ subject: e.subject, date: e.date })),
      homework: (homework ?? []).map((h) => ({ id: h.id, subject: h.subject, task: h.task, due: h.due })),
      weak: weak ?? [],
    });
    const first = plan.find((d) => d.date === today)?.blocks[0];
    if (first) await notify(u.id, "study", `You planned to study ${first.subject} today.`, first.focus, "/planner", k("planned"));
  }
  if (allowedByFrequency(freq, "insight") && weak?.[0] && localParts(new Date(), u.timezone).weekday === "Sun") {
    await notify(u.id, "ai", `Weak topic detected: ${weak[0].topic}`, "Ask Pip for a step-by-step explanation, then try a quick quiz.", `/tutor?subject=${encodeURIComponent(weak[0].subject)}&q=${encodeURIComponent(`Explain ${weak[0].topic} step by step`)}`, k("weak"));
  }
  if (allowedByFrequency(freq, "motivation")) {
    const n = Number(today.replace(/-/g, "")) % MOTIVATION.length;
    await notify(u.id, "motivation", MOTIVATION[n], undefined, "/home", k("motivation"));
  }
  if (allowedByFrequency(freq, "competition")) await competitionFor(u, today);
}

/** "<friend> is N XP ahead of you" for the student just above you this week. */
async function competitionFor(u: User, today: string) {
  const db = adminClient();
  const { data: groups } = await db.from("group_members").select("group_id, groups(name)").eq("user_id", u.id);
  const monday = startOfWeek(today);
  for (const g of groups ?? []) {
    const { data: members } = await db.from("group_members").select("user_id").eq("group_id", g.group_id);
    const ids = (members ?? []).map((m) => m.user_id);
    const { data: xp } = await db.from("xp_events").select("user_id, amount").in("user_id", ids).gte("day", monday);
    const totals = new Map(ids.map((id) => [id, 0]));
    for (const r of xp ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + r.amount);
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const i = ranked.findIndex(([id]) => id === u.id);
    if (i > 0) {
      const [aheadId, aheadXp] = ranked[i - 1];
      const { data: p } = await db.from("profiles").select("username, privacy").eq("id", aheadId).single();
      if (p?.username && p.privacy?.showOnLeaderboards !== false) {
        const name = (Array.isArray(g.groups) ? g.groups[0] : g.groups)?.name ?? "your group";
        await notify(u.id, "competition", `${p.username} is ${aheadXp - ranked[i][1]} XP ahead of you`, `You're #${i + 1} in ${name} this week.`, `/groups?g=${g.group_id}`, `ahead:${g.group_id}:${today}`);
      }
    }
  }
}

/** Settles last week's group challenges (most papers) and awards Top Performer. Idempotent. */
export async function settleWeek(today: string) {
  const db = adminClient();
  const lastMonday = addDays(startOfWeek(today), -7);
  const lastSunday = addDays(lastMonday, 6);
  const { data: groups } = await db.from("groups").select("id, name").eq("is_demo", false);
  let settled = 0;
  for (const g of groups ?? []) {
    const { data: existing } = await db.from("challenges").select("id, settled_at").match({ group_id: g.id, starts_on: lastMonday, kind: "papers" }).maybeSingle();
    if (existing?.settled_at) continue;
    const { data: members } = await db.from("group_members").select("user_id").eq("group_id", g.id);
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length < 2) continue;
    const [{ data: papers }, { data: xp }] = await Promise.all([
      db.from("papers").select("user_id").in("user_id", ids).eq("status", "marked").gte("submitted_at", `${lastMonday}T00:00:00Z`).lt("submitted_at", `${addDays(lastSunday, 1)}T00:00:00Z`),
      db.from("xp_events").select("user_id, amount").in("user_id", ids).gte("day", lastMonday).lte("day", lastSunday),
    ]);
    const count = new Map<string, number>();
    for (const p of papers ?? []) count.set(p.user_id, (count.get(p.user_id) ?? 0) + 1);
    const winner = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    const { data: ch } = await db
      .from("challenges")
      .upsert({ group_id: g.id, kind: "papers", title: "Most practice papers this week", starts_on: lastMonday, ends_on: lastSunday, winner_id: winner?.[0] ?? null, settled_at: new Date().toISOString() }, { onConflict: "group_id,starts_on,kind" })
      .select("id")
      .single();
    if (winner && ch) {
      await awardXp(winner[0], XP.groupChallengeWin, "challenge", { ref: `challenge:${ch.id}`, study: false });
      for (const id of ids) {
        await notify(id, "competition", id === winner[0] ? `You won the ${g.name} challenge! +200 XP` : `Challenge results are in for ${g.name}`, `Most practice papers last week: ${winner[1]}.`, `/groups?g=${g.id}`, `challenge:${ch.id}`);
      }
    }
    // Top Performer: first place on last week's XP leaderboard.
    const xpTotals = new Map<string, number>();
    for (const r of xp ?? []) xpTotals.set(r.user_id, (xpTotals.get(r.user_id) ?? 0) + r.amount);
    const top = [...xpTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 0) await grant(top[0], "top_performer");
    settled++;
  }
  return settled;
}

/**
 * Hourly tick. Each user gets their daily notifications at their chosen reminder hour
 * (local time); weekly challenges settle on Monday; pending push/email are delivered.
 */
export async function hourlyTick(now = new Date()) {
  const db = adminClient();
  const { data: users } = await db
    .from("profiles")
    .select("id, username, timezone, notif_prefs, streak, last_study_date, subjects, plan_hours")
    .not("onboarded_at", "is", null)
    .is("beta_removed_at", null)
    .eq("is_demo", false);
  let reminded = 0;
  for (const u of (users ?? []) as User[]) {
    const lp = localParts(now, u.timezone);
    const remindHour = Number((u.notif_prefs?.reminderTime ?? "16:30").split(":")[0]);
    if (lp.hour !== remindHour) continue;
    try {
      await dailyForUser(u, lp.date);
      reminded++;
    } catch (e) {
      console.error("daily notifications", u.id, e);
    }
  }
  const sydney = localParts(now, "Australia/Sydney");
  const settled = sydney.weekday === "Mon" ? await settleWeek(sydney.date) : 0;
  const delivered = await deliverPending(now);
  return { reminded, settled, ...delivered };
}
