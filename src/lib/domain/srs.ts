import { addDays } from "./dates";

/** Leitner box intervals in days, index = box (1–5). */
export const BOX_INTERVALS = [0, 1, 3, 7, 14, 30] as const;
export type Grade = "again" | "hard" | "good" | "easy";
export type CardSchedule = { box: number; due: string };

/** Spec §8.5: Again → box 1 due today; Hard → same box, max(1, interval/2); Good → next box; Easy → skip a box. */
export function grade(card: CardSchedule, g: Grade, today: string): CardSchedule {
  const box = Math.min(5, Math.max(1, card.box));
  switch (g) {
    case "again":
      return { box: 1, due: today };
    case "hard":
      return { box, due: addDays(today, Math.max(1, Math.floor(BOX_INTERVALS[box] / 2))) };
    case "good": {
      const next = Math.min(5, box + 1);
      return { box: next, due: addDays(today, BOX_INTERVALS[next]) };
    }
    case "easy": {
      const next = Math.min(5, box + 2);
      return { box: next, due: addDays(today, BOX_INTERVALS[next]) };
    }
  }
}

export function isDue(card: CardSchedule, today: string) {
  return card.due <= today;
}

/** Quiz: a wrong answer sends the card back to box 1. */
export function quizResult(card: CardSchedule, correct: boolean, today: string): CardSchedule {
  return correct ? card : { box: 1, due: today };
}
