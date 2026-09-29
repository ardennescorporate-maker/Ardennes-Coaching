import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { addDays, daysBetween, startOfWeek } from "@/lib/domain/dates";
import type { Viewer } from "@/lib/viewer";

export type Exam = { id: string; name: string; subject: string; date: string };
export type Homework = { id: string; task: string; subject: string; due: string; done_at: string | null };

export async function getExams(): Promise<Exam[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("id, name, subject, date").order("date");
  return data ?? [];
}

export function upcomingExams(exams: Exam[], today: string) {
  return exams.filter((e) => e.date >= today).map((e) => ({ ...e, daysLeft: daysBetween(today, e.date) }));
}

export async function getHomework(): Promise<Homework[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("homework").select("id, task, subject, due, done_at").order("due");
  return data ?? [];
}

export async function cardsDueCount(today: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("cards").select("id", { count: "exact", head: true }).lte("due", today);
  return count ?? 0;
}

export async function getWeakTopics(limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase.from("weak_topics").select("subject, topic, misses, updated_at").order("misses", { ascending: false }).limit(limit);
  return data ?? [];
}

/** XP per day for the 7 days ending today. */
export async function xpLast7Days(today: string): Promise<{ date: string; xp: number }[]> {
  const supabase = await createClient();
  const from = addDays(today, -6);
  const { data } = await supabase.from("xp_events").select("day, amount").gte("day", from).lte("day", today);
  const byDay = new Map<string, number>();
  for (const r of data ?? []) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.amount);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(from, i);
    return { date, xp: byDay.get(date) ?? 0 };
  });
}

export async function sessionStats() {
  const supabase = await createClient();
  const { count } = await supabase.from("study_sessions").select("id", { count: "exact", head: true }).eq("verified", true);
  return { sessions: count ?? 0 };
}

/** The next unfinished lesson in the first of the user's courses that isn't complete. */
export async function nextLesson(subjects: string[]) {
  if (!subjects.length) return null;
  const supabase = await createClient();
  const [{ data: courses }, { data: progress }] = await Promise.all([
    supabase.from("courses").select("id, subject, slug, lessons(id, title, slug, seq, units(title, position))").in("subject", subjects),
    supabase.from("lesson_progress").select("lesson_id, completed_at"),
  ]);
  const done = new Set((progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id));
  const ordered = [...(courses ?? [])].sort((a, b) => subjects.indexOf(a.subject) - subjects.indexOf(b.subject));
  for (const c of ordered) {
    const lessons = [...(c.lessons ?? [])].sort((a, b) => a.seq - b.seq);
    const next = lessons.find((l) => !done.has(l.id));
    if (next) {
      const unit = Array.isArray(next.units) ? next.units[0] : next.units;
      return { course: c.subject, courseSlug: c.slug, lesson: next.title, lessonSlug: next.slug, unit: unit?.title ?? "", done: lessons.filter((l) => done.has(l.id)).length, total: lessons.length };
    }
  }
  return null;
}

// ─── Groups ─────────────────────────────────────────────────────────────────

export type Group = { id: string; name: string; type: string; code: string; goal_hours: number; is_demo: boolean; created_by: string | null };

export async function myGroups(): Promise<Group[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("group_members").select("joined_at, groups(id, name, type, code, goal_hours, is_demo, created_by)").order("joined_at");
  return (data ?? []).map((r) => (Array.isArray(r.groups) ? r.groups[0] : r.groups)).filter(Boolean) as Group[];
}

export type LeaderRow = { key: string; userId: string | null; username: string; avatarColour: string; isBeta: boolean; streak: number; xp: number; isYou: boolean; hidden: boolean; demo: boolean; weekMinutes: number; weekPapers: number };

/** Group leaderboard. Caller must be a member (checked here). Respects "show me on leaderboards". */
export async function leaderboard(groupId: string, period: "week" | "all", viewer: Viewer): Promise<LeaderRow[]> {
  const db = adminClient();
  const { data: members } = await db.from("group_members").select("user_id").eq("group_id", groupId);
  const ids = (members ?? []).map((m) => m.user_id);
  if (!ids.includes(viewer.userId)) return [];
  const monday = startOfWeek(viewer.today);

  const [{ data: profiles }, { data: xp }, { data: sessions }, { data: papers }, { data: group }] = await Promise.all([
    db.from("profiles").select("id, username, avatar_colour, xp, streak, last_study_date, beta_joined_at, beta_removed_at, privacy").in("id", ids),
    db.from("xp_events").select("user_id, amount").in("user_id", ids).gte("day", monday),
    db.from("study_sessions").select("user_id, minutes").in("user_id", ids).eq("verified", true).gte("day", monday),
    db.from("papers").select("user_id").in("user_id", ids).eq("status", "marked").gte("submitted_at", `${monday}T00:00:00Z`),
    db.from("groups").select("is_demo").eq("id", groupId).single(),
  ]);
  const sum = (rows: { user_id: string; amount?: number; minutes?: number }[] | null, key: "amount" | "minutes") => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + (r[key] ?? 0));
    return m;
  };
  const weekXp = sum(xp, "amount");
  const weekMin = sum(sessions, "minutes");
  const weekPapers = new Map<string, number>();
  for (const p of papers ?? []) weekPapers.set(p.user_id, (weekPapers.get(p.user_id) ?? 0) + 1);

  const rows: LeaderRow[] = (profiles ?? []).map((p) => {
    const isYou = p.id === viewer.userId;
    const hidden = !isYou && p.privacy?.showOnLeaderboards === false;
    const gap = p.last_study_date ? daysBetween(p.last_study_date, viewer.today) : 99;
    return {
      key: p.id,
      userId: p.id,
      username: hidden ? "Hidden student" : (p.username ?? "student"),
      avatarColour: hidden ? "#8593AD" : p.avatar_colour,
      isBeta: Boolean(p.beta_joined_at && !p.beta_removed_at),
      streak: gap <= 1 ? p.streak : 0,
      xp: period === "week" ? (weekXp.get(p.id) ?? 0) : p.xp,
      isYou,
      hidden,
      demo: false,
      weekMinutes: weekMin.get(p.id) ?? 0,
      weekPapers: weekPapers.get(p.id) ?? 0,
    };
  });

  if (group?.is_demo) {
    const { data: demo } = await db.from("demo_students").select("*").eq("group_id", groupId);
    for (const d of demo ?? []) {
      rows.push({ key: d.id, userId: null, username: d.username, avatarColour: d.avatar_colour, isBeta: true, streak: d.streak, xp: period === "week" ? d.week_xp : d.xp, isYou: false, hidden: false, demo: true, weekMinutes: d.week_minutes, weekPapers: d.week_papers });
    }
  }
  return rows.sort((a, b) => b.xp - a.xp);
}
