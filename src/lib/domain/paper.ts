import { z } from "zod";

export const QuestionSchema = z.object({
  id: z.string().min(1).max(20),
  type: z.enum(["mcq", "short", "extended", "essay"]),
  topic: z.string().min(1).max(120),
  prompt: z.string().min(1).max(4000),
  stimulus: z.string().max(4000).optional().nullable(),
  marks: z.number().int().min(1).max(25),
  options: z.array(z.string().min(1).max(600)).length(4).optional().nullable(),
  answer: z.string().max(4000).optional().nullable(),
  criteria: z.string().min(1).max(4000),
  sample: z.string().min(1).max(8000),
});
export const PaperSchema = z.object({
  title: z.string().min(1).max(200),
  timeMinutes: z.number().int().min(5).max(240),
  instructions: z.array(z.string().max(300)).max(10),
  sections: z
    .array(z.object({ name: z.string().min(1).max(120), questions: z.array(QuestionSchema).min(1).max(20) }))
    .min(1)
    .max(6),
});
export type Question = z.infer<typeof QuestionSchema>;
export type Paper = z.infer<typeof PaperSchema>;

export const MarkSchema = z.object({
  questions: z.array(z.object({ id: z.string(), awarded: z.number(), feedback: z.string().max(2000) })),
  strengths: z.array(z.string().max(400)).max(6),
  improvements: z.array(z.string().max(400)).max(6),
  weakTopics: z.array(z.string().max(120)).max(8),
  predicted: z.string().max(60).optional(),
  exemplar: z.string().max(6000),
  essay: z
    .object({ structure: z.number(), argument: z.number(), evidence: z.number(), vocabulary: z.number(), analysis: z.number() })
    .optional()
    .nullable(),
});
export type AiMark = z.infer<typeof MarkSchema>;

export type MarkedQuestion = { id: string; awarded: number; max: number; feedback: string; topic: string };
export type PaperResult = {
  questions: MarkedQuestion[];
  score: number;
  max: number;
  pct: number;
  band: string;
  strengths: string[];
  improvements: string[];
  weakTopics: string[];
  exemplar: string;
  essay?: { structure: number; argument: number; evidence: number; vocabulary: number; analysis: number } | null;
};

export type PaperConfig = {
  exam: string;
  subject: string;
  year: string;
  difficulty: "Foundation" | "Exam standard" | "Challenging" | "Band 6 / top grade";
  topics: string;
  timeMinutes: number;
  counts: { mcq: number; short: number; extended: number; essay: number };
};

export const DIFFICULTIES = ["Foundation", "Exam standard", "Challenging", "Band 6 / top grade"] as const;

export function allQuestions(p: Paper): Question[] {
  return p.sections.flatMap((s) => s.questions);
}
export function totalMarks(p: Paper): number {
  return allQuestions(p).reduce((a, q) => a + q.marks, 0);
}

const LETTERS = ["A", "B", "C", "D"];
/** Normalises an MCQ answer key ("B", "b", "(B)", or the option text) to a letter. */
export function mcqKey(q: Question): string | null {
  if (!q.answer) return null;
  const a = q.answer.trim();
  const m = a.match(/^\(?([A-Da-d])\)?(?:[.):\s]|$)/);
  if (m) return m[1].toUpperCase();
  const i = q.options?.findIndex((o) => o.trim().toLowerCase() === a.toLowerCase()) ?? -1;
  return i >= 0 ? LETTERS[i] : null;
}

/** Marks MCQs locally; returns null for written questions (AI marks those). */
export function markMcq(q: Question, answer: string | undefined): MarkedQuestion | null {
  if (q.type !== "mcq") return null;
  const key = mcqKey(q);
  const right = key !== null && answer?.toUpperCase() === key;
  return {
    id: q.id,
    awarded: right ? q.marks : 0,
    max: q.marks,
    topic: q.topic,
    feedback: right ? "Correct." : answer ? `Not quite. The answer is ${key}.` : `No answer given. The answer is ${key}.`,
  };
}

/** Never trust AI marks: whole numbers between 0 and the question's max. */
export function clampAwarded(awarded: unknown, max: number): number {
  const n = typeof awarded === "number" && Number.isFinite(awarded) ? Math.round(awarded) : 0;
  return Math.max(0, Math.min(max, n));
}

export function pctOf(score: number, max: number) {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

/** Pip's reaction to a paper result. */
export function paperReaction(pct: number): { mood: "cheer" | "happy" | "talk"; line: string } {
  if (pct >= 80) return { mood: "cheer", line: "Wow, what a flight! That's a top result." };
  if (pct >= 50) return { mood: "happy", line: "Solid work! A few tweaks and you'll be soaring." };
  return { mood: "talk", line: "Every expert started here. Let's fix these together, one step at a time." };
}
