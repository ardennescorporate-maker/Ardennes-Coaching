import { z } from "zod";

/** Schema sent to Claude (no numeric bounds; checked by validateLesson). */
export const LessonSchema = z.object({
  hook: z.string(),
  goals: z.array(z.string()),
  steps: z.array(z.object({ title: z.string(), body: z.string(), example: z.string().optional() })),
  questions: z.array(z.object({ q: z.string(), options: z.array(z.string()), answer: z.string(), explain: z.string() })),
  summary: z.array(z.string()),
});
export type LessonContent = z.infer<typeof LessonSchema>;

const LETTERS = ["A", "B", "C", "D"] as const;

export function answerIndex(answer: string, options: string[]): number {
  const a = answer.trim();
  const m = a.match(/^\(?([A-Da-d])\)?(?:[.):\s]|$)/);
  if (m) return LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  return options.findIndex((o) => o.trim().toLowerCase() === a.toLowerCase());
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Returns a problem description, or null when the lesson is well-formed. */
export function validateLesson(l: LessonContent): string | null {
  if (!l.hook?.trim()) return "missing hook";
  if (l.goals.length !== 3) return "goals must have exactly 3 items";
  if (l.steps.length < 3 || l.steps.length > 4) return "steps must have 3 or 4 items";
  if (l.steps.some((s) => !s.title.trim() || !s.body.trim())) return "every step needs a title and body";
  if (l.steps.some((s) => words(s.body) > 150)) return "each step body must be under 110 words";
  if (!l.steps.some((s) => s.example?.trim())) return "include at least one worked example";
  if (l.questions.length !== 4) return "questions must have exactly 4 items";
  for (const q of l.questions) {
    if (q.options.length !== 4) return "every question needs exactly 4 options";
    if (answerIndex(q.answer, q.options) < 0) return `answer "${q.answer}" must be a letter A–D`;
    if (!q.explain.trim()) return "every question needs an explanation";
  }
  if (l.summary.length !== 3) return "summary must have exactly 3 items";
  return null;
}

/** Stars: 3 = all correct, 2 = one wrong, 1 = otherwise. */
export function starsFor(correct: number, total: number): number {
  if (correct >= total) return 3;
  if (correct === total - 1) return 2;
  return 1;
}

/** Grades answers (option indexes) against the lesson. */
export function gradeLesson(l: LessonContent, answers: (number | null)[]) {
  const results = l.questions.map((q, i) => answers[i] === answerIndex(q.answer, q.options));
  const correct = results.filter(Boolean).length;
  return { results, correct, total: l.questions.length, stars: starsFor(correct, l.questions.length) };
}
