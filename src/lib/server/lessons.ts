import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { structured } from "@/lib/ai";
import { SAFETY, languageRule } from "@/lib/ai/prompts";
import { builtinLesson } from "@/lib/content/builtinLessons";
import { LessonSchema, gradeLesson, validateLesson, type LessonContent } from "@/lib/domain/lesson";
import { XP } from "@/lib/domain/xp";
import { addWeakTopics, awardXp, bumpCounters, type Reward } from "./gamify";
import type { Viewer } from "@/lib/viewer";

export type LessonNode = { id: string; title: string; slug: string; seq: number; position: number; stars: number; done: boolean };
export type UnitNode = { id: string; position: number; title: string; description: string; lessons: LessonNode[] };
export type CourseTree = { id: string; subject: string; slug: string; system: string; year_level: string; units: UnitNode[]; done: number; total: number; currentSeq: number };

/** Course with units, lessons and this user's progress. `currentSeq` = first unfinished lesson. */
export async function getCourseTree(slug: string): Promise<CourseTree | null> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("courses")
    .select("id, subject, slug, system, year_level, units(id, position, title, description, lessons(id, title, slug, seq, position))")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) return null;
  const { data: prog } = await supabase.from("lesson_progress").select("lesson_id, stars, completed_at").eq("course_id", c.id);
  const pm = new Map((prog ?? []).map((p) => [p.lesson_id, p]));
  const units: UnitNode[] = [...c.units]
    .sort((a, b) => a.position - b.position)
    .map((u) => ({
      ...u,
      lessons: [...u.lessons]
        .sort((a, b) => a.position - b.position)
        .map((l) => ({ ...l, stars: pm.get(l.id)?.stars ?? 0, done: Boolean(pm.get(l.id)?.completed_at) })),
    }));
  const all = units.flatMap((u) => u.lessons);
  const firstOpen = all.find((l) => !l.done);
  return { id: c.id, subject: c.subject, slug: c.slug, system: c.system, year_level: c.year_level, units, done: all.filter((l) => l.done).length, total: all.length, currentSeq: firstOpen?.seq ?? all.length };
}

/** Course summaries (done/total) for the picker. */
export async function courseSummaries(subjects: string[]) {
  const supabase = await createClient();
  const [{ data: courses }, { data: prog }] = await Promise.all([
    supabase.from("courses").select("id, subject, slug, sort, lessons(count)").order("sort"),
    supabase.from("lesson_progress").select("course_id, completed_at"),
  ]);
  const done = new Map<string, number>();
  for (const p of prog ?? []) if (p.completed_at) done.set(p.course_id, (done.get(p.course_id) ?? 0) + 1);
  const rows = (courses ?? []).map((c) => ({ subject: c.subject, slug: c.slug, done: done.get(c.id) ?? 0, total: (c.lessons as unknown as { count: number }[])[0]?.count ?? 0 }));
  return { mine: rows.filter((r) => subjects.includes(r.subject)).sort((a, b) => subjects.indexOf(a.subject) - subjects.indexOf(b.subject)), others: rows.filter((r) => !subjects.includes(r.subject)) };
}

export type LessonCtx = {
  course: CourseTree;
  unit: UnitNode;
  lesson: LessonNode;
  unlocked: boolean;
  prevTitles: string[];
  next: LessonNode | null;
};

export async function lessonContext(courseSlug: string, lessonSlug: string): Promise<LessonCtx | null> {
  const course = await getCourseTree(courseSlug);
  if (!course) return null;
  const all = course.units.flatMap((u) => u.lessons);
  const lesson = all.find((l) => l.slug === lessonSlug);
  if (!lesson) return null;
  const unit = course.units.find((u) => u.lessons.some((l) => l.id === lesson.id))!;
  return {
    course,
    unit,
    lesson,
    unlocked: lesson.done || lesson.seq <= course.currentSeq,
    prevTitles: all.filter((l) => l.seq < lesson.seq && l.seq >= lesson.seq - 3).map((l) => l.title),
    next: all.find((l) => l.seq === lesson.seq + 1) ?? null,
  };
}

// ─── Content ────────────────────────────────────────────────────────────────

/**
 * The lesson this student should see: their pinned version, else built-in (English),
 * else the shared cache for their system + language, else a freshly generated one.
 * `fresh` ("Get a new version") always generates and pins a new copy.
 */
export async function getLessonContent(v: Viewer, ctx: LessonCtx, fresh = false): Promise<{ id: string; content: LessonContent; source: string }> {
  const db = adminClient();
  const system = v.profile.system ?? ctx.course.system;
  const language = v.profile.language;
  const pin = (contentId: string) =>
    db.from("lesson_progress").upsert({ user_id: v.userId, lesson_id: ctx.lesson.id, course_id: ctx.course.id, content_id: contentId }, { onConflict: "user_id,lesson_id" });

  if (!fresh) {
    const { data: prog } = await db.from("lesson_progress").select("content_id").match({ user_id: v.userId, lesson_id: ctx.lesson.id }).maybeSingle();
    if (prog?.content_id) {
      const { data } = await db.from("lesson_content").select("id, content, source").eq("id", prog.content_id).maybeSingle();
      if (data) return data;
    }
    const builtin = language === "en" ? builtinLesson(ctx.course.subject, ctx.lesson.title) : null;
    if (builtin) {
      const { data: row } = await db.from("lesson_content").select("id, content, source").match({ lesson_id: ctx.lesson.id, source: "builtin" }).maybeSingle();
      if (row) return row;
      const { data } = await db.from("lesson_content").insert({ lesson_id: ctx.lesson.id, system, language, source: "builtin", content: builtin, reviewed: true }).select("id, content, source").single();
      return data!;
    }
    const { data: cached } = await db
      .from("lesson_content")
      .select("id, content, source")
      .match({ lesson_id: ctx.lesson.id, system, language, source: "ai" })
      .is("created_for", null)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (cached) return cached;
  }

  const content = await generateLesson(v, ctx, system);
  const { data, error } = await db
    .from("lesson_content")
    .insert({ lesson_id: ctx.lesson.id, system, language, source: "ai", content, created_for: fresh ? v.userId : null })
    .select("id, content, source")
    .single();
  if (error || !data) throw new Error(`save lesson: ${error?.message}`);
  if (fresh) await pin(data.id);
  return data;
}

async function generateLesson(v: Viewer, ctx: LessonCtx, system: string): Promise<LessonContent> {
  const year = v.profile.year_level ?? ctx.course.year_level;
  return structured({
    user: { userId: v.userId, plan: v.profile.plan, isBeta: v.isBeta },
    kind: "lesson",
    tier: "strong",
    effort: "medium",
    maxTokens: 12000,
    schema: LessonSchema,
    validate: validateLesson,
    system: `You are Pip, StudyPilot's friendly blue-bird tutor, writing one short interactive lesson.
${SAFETY}
${languageRule(v.profile.language)}`,
    content: `Write a lesson for ${year} students studying ${ctx.course.subject} (${system}).
Unit: ${ctx.unit.title} — ${ctx.unit.description}
Lesson: ${ctx.lesson.title}
Previous lessons (already taught, build on them, don't repeat): ${ctx.prevTitles.join("; ") || "none, this is the first lesson"}

Requirements:
- Match the ${system} syllabus content, command verbs and level for ${year}. Be accurate.
- hook: one or two friendly sentences in Pip's voice (first person, encouraging) linking the topic to everyday life.
- goals: exactly 3 "By the end you'll be able to" outcomes, each starting with a verb.
- steps: 3 or 4 steps; each teaches ONE idea in under 110 words of Markdown. Include "example" (a short worked example with each line of working) in at least one step.
- questions: exactly 4 multiple-choice check questions testing the goals. Each has exactly 4 plausible options, "answer" as a single letter A–D, and "explain" (1–2 sentences on why the answer is right and the common mistake). Vary the correct letter.
- summary: exactly 3 key takeaways.
- Use LaTeX for maths ($...$) and \\text{} for chemical formulas.`,
    mock: () => mockLesson(ctx.course.subject, ctx.lesson.title),
  });
}

function mockLesson(subject: string, title: string): LessonContent {
  return {
    hook: `G'day! Today we're flying into "${title}". I'll keep it short and clear. (Demo mode: connect an AI key for a real lesson.)`,
    goals: [`Explain the key idea of ${title.toLowerCase()}`, "Apply it to a simple example", "Avoid the most common mistake"],
    steps: [
      { title: "The big idea", body: `Every topic in ${subject} builds on a core idea. For **${title}**, start by naming the key terms and what they mean.` },
      { title: "A worked example", body: "Let's see the idea in action with a quick example, one line at a time.", example: "Step 1: write what you know.\n\nStep 2: apply the rule.\n\nStep 3: check the answer makes sense." },
      { title: "Watch out for", body: "The most common mistake is rushing the first step. Slow down and set out your working clearly." },
    ],
    questions: [0, 1, 2, 3].map((i) => ({
      q: `Check ${i + 1}: which option best matches good exam technique?`,
      options: ["Skip the working", "Set out each step clearly", "Guess and move on", "Write only the final answer"],
      answer: "B",
      explain: "Clear working earns method marks even if the final answer slips.",
    })),
    summary: [`${title} starts with the key terms.`, "Worked examples show each line.", "Clear working earns marks."],
  };
}

// ─── Completion ─────────────────────────────────────────────────────────────

export type LessonResult = { correct: number; total: number; stars: number; results: boolean[]; reward: Reward; firstTime: boolean };

/** Grades on the server against the stored answer key, then awards XP and records weak topics. */
export async function completeLesson(v: Viewer, ctx: LessonCtx, contentId: string, answers: (number | null)[]): Promise<LessonResult> {
  const db = adminClient();
  const { data: row } = await db.from("lesson_content").select("content, lesson_id").eq("id", contentId).single();
  if (!row || row.lesson_id !== ctx.lesson.id) throw new Error("content mismatch");
  const content = row.content as LessonContent;
  const g = gradeLesson(content, answers.slice(0, content.questions.length));

  const { data: prev } = await db.from("lesson_progress").select("stars, best_score, attempts, completed_at").match({ user_id: v.userId, lesson_id: ctx.lesson.id }).maybeSingle();
  const firstTime = !prev?.completed_at;
  await db.from("lesson_progress").upsert(
    {
      user_id: v.userId,
      lesson_id: ctx.lesson.id,
      course_id: ctx.course.id,
      content_id: contentId,
      stars: Math.max(prev?.stars ?? 0, g.stars),
      best_score: Math.max(prev?.best_score ?? 0, g.correct),
      attempts: (prev?.attempts ?? 0) + 1,
      completed_at: prev?.completed_at ?? new Date().toISOString(),
      state: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (g.correct < g.total) await addWeakTopics(v.userId, ctx.course.subject, [ctx.lesson.title]);
  await bumpCounters(v.userId, { questions: g.total, correct: g.correct });
  const reward = firstTime
    ? await awardXp(v.userId, XP.lessonFirst(g.correct), "lesson", { ref: `lesson:${ctx.lesson.id}` })
    : await awardXp(v.userId, XP.lessonReplay(g.correct), "lesson_replay");
  return { ...g, reward, firstTime };
}
