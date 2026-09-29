/** XP rules (spec §7). All awards are recomputed and clamped on the server. */
export const XP = {
  studySession: (minutes: number) => clampInt(minutes, 10, 240),
  focusBlock: (minutes: number) => clampInt(minutes, 1, 240),
  firstTutorQuestion: 10,
  paper: (scorePct: number) => 50 + Math.round(clamp(scorePct, 0, 100) / 100 * 50),
  lessonFirst: (correct: number) => 30 + 5 * clampInt(correct, 0, 10),
  lessonReplay: (correct: number) => 10 + 2 * clampInt(correct, 0, 10),
  flashcardReview: (cards: number) => Math.max(5, clampInt(cards, 0, 500) * 2),
  deckQuiz: (correct: number) => 10 + 5 * clampInt(correct, 0, 10),
  aiFlashcards: 20,
  homework: 15,
  groupChallengeWin: 200,
} as const;

export const MAX_SESSION_MINUTES_PER_DAY = 6 * 60;
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;
export const XP_MILESTONE_EVERY = 1000;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}
function clampInt(n: number, lo: number, hi: number) {
  return Math.round(clamp(n, lo, hi));
}
