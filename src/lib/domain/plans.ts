/** Plan limits (spec §8.10). Beta users are treated as Premium Exam. */
export type PlanId = "free" | "premium" | "premium_exam";

export const PLANS: Record<PlanId, { name: string; price: number; tag: string }> = {
  free: { name: "Free", price: 0, tag: "Start here" },
  premium: { name: "Premium", price: 20, tag: "Most popular" },
  premium_exam: { name: "Premium Exam", price: 30, tag: "Exam year" },
};

/** AI kinds that are metered. */
export type AiKind = "tutor" | "lesson" | "paper" | "mark" | "flashcards" | "timeline" | "evidence";

/** Daily limits per kind (papers are per month on Free). null = unlimited (still rate-limited). */
export const LIMITS: Record<PlanId, Record<AiKind, { per: "day" | "month"; max: number | null }>> = {
  free: {
    tutor: { per: "day", max: 15 },
    lesson: { per: "day", max: 5 },
    paper: { per: "month", max: 3 },
    mark: { per: "month", max: 3 },
    flashcards: { per: "day", max: 0 },
    timeline: { per: "day", max: 0 },
    evidence: { per: "day", max: 12 },
  },
  premium: {
    tutor: { per: "day", max: null },
    lesson: { per: "day", max: null },
    paper: { per: "month", max: 20 },
    mark: { per: "month", max: 20 },
    flashcards: { per: "day", max: 20 },
    timeline: { per: "day", max: 5 },
    evidence: { per: "day", max: 20 },
  },
  premium_exam: {
    tutor: { per: "day", max: null },
    lesson: { per: "day", max: null },
    paper: { per: "month", max: null },
    mark: { per: "month", max: null },
    flashcards: { per: "day", max: null },
    timeline: { per: "day", max: null },
    evidence: { per: "day", max: 20 },
  },
};

/** Hard safety cap per user per day regardless of plan (cost control). */
export const DAILY_HARD_CAP = 400;

export function effectivePlan(plan: PlanId, isBeta: boolean): PlanId {
  return isBeta ? "premium_exam" : plan;
}
