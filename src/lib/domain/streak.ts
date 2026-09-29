import { daysBetween } from "./dates";

export type StreakState = { streak: number; lastStudyDate: string | null };

/**
 * Applies a study action on `today` (YYYY-MM-DD in the user's zone).
 * Same day: unchanged. Next day: +1. Any gap (or first ever): 1.
 */
export function applyStudy(state: StreakState, today: string): StreakState {
  if (!state.lastStudyDate) return { streak: 1, lastStudyDate: today };
  const gap = daysBetween(state.lastStudyDate, today);
  if (gap <= 0) return { streak: Math.max(1, state.streak), lastStudyDate: state.lastStudyDate };
  if (gap === 1) return { streak: state.streak + 1, lastStudyDate: today };
  return { streak: 1, lastStudyDate: today };
}

export type StreakStatus = "studied" | "at-risk" | "broken" | "none";

/** For display: has the user studied today, is the streak at risk (studied yesterday), or already lost? */
export function streakStatus(state: StreakState, today: string): StreakStatus {
  if (!state.lastStudyDate || state.streak <= 0) return "none";
  const gap = daysBetween(state.lastStudyDate, today);
  if (gap <= 0) return "studied";
  if (gap === 1) return "at-risk";
  return "broken";
}

/** Streak to show: a broken streak displays as 0. */
export function displayStreak(state: StreakState, today: string): number {
  return streakStatus(state, today) === "broken" ? 0 : state.streak;
}
