"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { SUBJECTS } from "@/lib/domain/catalog";
import { XP } from "@/lib/domain/xp";
import { WEEKDAYS } from "@/lib/domain/planner";
import { daysBetween } from "@/lib/domain/dates";
import { aiErrorMessage, structured } from "@/lib/ai";
import { SAFETY, languageRule } from "@/lib/ai/prompts";
import { awardXp, type Reward } from "@/lib/server/gamify";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const subject = z.enum(SUBJECTS);

async function viewer() {
  const v = await getViewer();
  if (!v) throw new Error("signed out");
  return v;
}

export async function saveHoursAction(hours: Record<string, number>) {
  const v = await viewer();
  const clean = Object.fromEntries(WEEKDAYS.map((d) => [d, Math.round(Math.max(0, Math.min(6, Number(hours[d]) || 0)) * 2) / 2]));
  const supabase = await createClient();
  await supabase.from("profiles").update({ plan_hours: clean }).eq("id", v.userId);
  revalidatePath("/planner");
}

export async function addExamAction(input: { name: string; subject: string; date: string }) {
  const v = await viewer();
  const p = z.object({ name: z.string().trim().min(1).max(80), subject, date }).safeParse(input);
  if (!p.success) return { error: "Add a name, subject and date." };
  const supabase = await createClient();
  await supabase.from("exams").insert({ ...p.data, user_id: v.userId });
  revalidatePath("/planner");
  return { ok: true };
}

export async function removeExamAction(id: string) {
  await viewer();
  const supabase = await createClient();
  await supabase.from("exams").delete().eq("id", id);
  revalidatePath("/planner");
}

export async function addHomeworkAction(input: { task: string; subject: string; due: string }) {
  const v = await viewer();
  const p = z.object({ task: z.string().trim().min(1).max(160), subject, due: date }).safeParse(input);
  if (!p.success) return { error: "Add a task, subject and due date." };
  const supabase = await createClient();
  await supabase.from("homework").insert({ ...p.data, user_id: v.userId });
  revalidatePath("/planner");
  return { ok: true };
}

/** Tick or untick homework. Ticking earns 15 XP once per task. */
export async function toggleHomeworkAction(id: string, done: boolean): Promise<Reward | null> {
  const v = await viewer();
  const supabase = await createClient();
  const { data } = await supabase.from("homework").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id).select("id").maybeSingle();
  revalidatePath("/planner");
  if (!data || !done) return null;
  return awardXp(v.userId, XP.homework, "homework", { ref: `hw:${id}` });
}

export async function deleteHomeworkAction(id: string) {
  await viewer();
  const supabase = await createClient();
  await supabase.from("homework").delete().eq("id", id);
  revalidatePath("/planner");
}

const TimelineSchema = z.object({
  weeks: z.array(z.object({ label: z.string(), focus: z.string(), tasks: z.array(z.string()) })),
  tips: z.array(z.string()),
});
export type Timeline = z.infer<typeof TimelineSchema>;

/** Pip's week-by-week plan up to the last exam (max 6 weeks), weak topics first. */
export async function generateTimelineAction(): Promise<{ error?: string }> {
  const v = await viewer();
  const db = adminClient();
  const [{ data: exams }, { data: weak }] = await Promise.all([
    db.from("exams").select("name, subject, date").eq("user_id", v.userId).gte("date", v.today).order("date"),
    db.from("weak_topics").select("subject, topic, misses").eq("user_id", v.userId).order("misses", { ascending: false }).limit(12),
  ]);
  if (!exams?.length) return { error: "Add at least one upcoming exam first." };
  const weeks = Math.max(1, Math.min(6, Math.ceil(daysBetween(v.today, exams[exams.length - 1].date) / 7)));
  try {
    const t = await structured({
      user: { userId: v.userId, plan: v.profile.plan, isBeta: v.isBeta },
      kind: "timeline",
      tier: "strong",
      effort: "low",
      maxTokens: 6000,
      schema: TimelineSchema,
      validate: (x) => (x.weeks.length !== weeks ? `write exactly ${weeks} weeks` : x.tips.length !== 3 ? "give exactly 3 tips" : null),
      system: `You are Pip, a cheerful study-planning bird. Plans are realistic for a busy teenager.\n${SAFETY}\n${languageRule(v.profile.language)}`,
      content: `Today is ${v.today}. Student: ${v.profile.year_level}, ${v.profile.system}. Subjects: ${v.profile.subjects.join(", ")}.
Upcoming exams: ${exams.map((e) => `${e.name} (${e.subject}) on ${e.date}`).join("; ")}.
Weak topics (most missed first): ${weak?.map((w) => `${w.topic} [${w.subject}]`).join("; ") || "none recorded"}.
Available study hours per weekday: ${JSON.stringify(v.profile.plan_hours)}.

Write a revision timeline of exactly ${weeks} weeks ("Week 1 (from ${v.today})" etc.). Each week: a one-line focus and 3–5 specific tasks. Put weak topics first and exams in date order; the week before each exam is past papers under timed conditions. Then exactly 3 short tips.`,
      mock: () => ({
        weeks: Array.from({ length: weeks }, (_, i) => ({ label: `Week ${i + 1}`, focus: i === 0 ? `Fix weak topics: ${weak?.[0]?.topic ?? "your hardest topic"}` : "Mixed revision and timed practice", tasks: ["Two 45-minute active recall sessions", "One timed practice paper", "Review flashcards daily (demo plan)"] })),
        tips: ["Start with your weakest topic while you're fresh.", "Do past papers under real time limits.", "Sleep well the week of your exams."],
      }),
    });
    await db.from("revision_timelines").upsert({ user_id: v.userId, content: t, created_at: new Date().toISOString() });
    revalidatePath("/planner");
    return {};
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
}
