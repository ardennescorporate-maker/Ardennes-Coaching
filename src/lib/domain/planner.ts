import { addDays, daysBetween, startOfWeek, weekdayMon0 } from "./dates";

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type PlanHours = Record<Weekday, number>;
export const DEFAULT_HOURS: PlanHours = { mon: 2, tue: 2, wed: 2, thu: 2, fri: 1.5, sat: 3, sun: 2.5 };

export type PlanExam = { subject: string; date: string; name?: string };
export type PlanHomework = { id?: string; subject: string; task: string; due: string; done?: boolean };
export type PlanWeak = { subject: string; topic: string; misses: number };
export type Block = { subject: string; minutes: number; focus: string; kind: "homework" | "study" };
export type PlanDay = { date: string; weekday: Weekday; blocks: Block[] };

const ROTATING = ["Active recall with flashcards", "Worked examples then practice set", "Summarise one topic from memory", "Mixed revision questions"];
const MAX_BLOCKS = 4;
const MIN_BLOCK = 25;

/** Days until the nearest upcoming exam for a subject (from `from`), or null. */
function daysToExam(exams: PlanExam[], subject: string, from: string): number | null {
  let best: number | null = null;
  for (const e of exams) {
    if (e.subject !== subject) continue;
    const d = daysBetween(from, e.date);
    if (d >= 0 && (best === null || d < best)) best = d;
  }
  return best;
}

export function examWeight(days: number | null): number {
  if (days === null) return 0;
  if (days <= 7) return 4;
  if (days <= 21) return 2.5;
  if (days <= 45) return 1.4;
  return 0;
}

/**
 * Builds a week of study blocks (spec §8.6).
 * Homework due within 2 days gets a 30-minute block first; subjects are then weighted by
 * nearest exam plus a rotating bonus; up to 4 blocks per day within the day's available time.
 */
export function planWeek(input: { today: string; hours: PlanHours; subjects: string[]; exams: PlanExam[]; homework: PlanHomework[]; weak: PlanWeak[] }): PlanDay[] {
  const monday = startOfWeek(input.today);
  const subjects = [...new Set(input.subjects)].filter(Boolean);
  const hwUsed = new Set<string>();
  const weakBySubject = new Map<string, PlanWeak[]>();
  for (const w of [...input.weak].sort((a, b) => b.misses - a.misses)) {
    weakBySubject.set(w.subject, [...(weakBySubject.get(w.subject) ?? []), w]);
  }
  const weakUsed = new Map<string, number>();
  let rotate = 0;

  return WEEKDAYS.map((weekday, dayIdx) => {
    const date = addDays(monday, dayIdx);
    let left = Math.round(Math.max(0, Math.min(6, input.hours[weekday] ?? 0)) * 60);
    const blocks: Block[] = [];

    // 1. Homework due in the next 2 days.
    for (const h of input.homework) {
      const key = h.id ?? `${h.subject}|${h.task}|${h.due}`;
      if (h.done || hwUsed.has(key)) continue;
      const until = daysBetween(date, h.due);
      if (until < 0 || until > 2) continue;
      if (blocks.length >= MAX_BLOCKS || left < MIN_BLOCK) break;
      const minutes = Math.min(30, left);
      blocks.push({ subject: h.subject, minutes, focus: `Homework: ${h.task}`, kind: "homework" });
      hwUsed.add(key);
      left -= minutes;
    }

    if (!subjects.length) return { date, weekday, blocks };

    // 2. Weighted subjects.
    const weights = new Map(
      subjects.map((s, i) => {
        const rotatingBonus = (i + dayIdx) % subjects.length === 0 ? 1 : (i + dayIdx) % subjects.length === 1 ? 0.5 : 0;
        return [s, 1 + examWeight(daysToExam(input.exams, s, date)) + rotatingBonus];
      }),
    );
    while (blocks.length < MAX_BLOCKS && left >= MIN_BLOCK) {
      const [subject] = [...weights.entries()].sort((a, b) => b[1] - a[1] || subjects.indexOf(a[0]) - subjects.indexOf(b[0]))[0];
      const dte = daysToExam(input.exams, subject, date);
      const length = dte !== null && dte <= 7 ? 60 : 45;
      const minutes = Math.min(length, left);
      let focus: string;
      if (dte !== null && dte <= 7) focus = "Past-paper practice under timed conditions";
      else {
        const weak = weakBySubject.get(subject) ?? [];
        const used = weakUsed.get(subject) ?? 0;
        if (used < weak.length) {
          focus = `Weak area: ${weak[used].topic}`;
          weakUsed.set(subject, used + 1);
        } else focus = ROTATING[rotate++ % ROTATING.length];
      }
      blocks.push({ subject, minutes, focus, kind: "study" });
      left -= minutes;
      weights.set(subject, weights.get(subject)! / 2.2);
    }
    return { date, weekday, blocks };
  });
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[weekdayMon0(date)];
}
