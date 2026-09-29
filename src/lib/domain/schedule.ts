/** Local wall-clock parts of an instant in a time zone. */
export function localParts(at: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
  const parts = Object.fromEntries(f.formatToParts(at).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), weekday: parts.weekday as string };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Is `now` (HH:MM) inside quiet hours? Handles ranges that cross midnight (22:00–07:00). */
export function inQuietHours(now: string, start: string, end: string): boolean {
  const n = toMin(now);
  const s = toMin(start);
  const e = toMin(end);
  if (s === e) return false;
  return s < e ? n >= s && n < e : n >= s || n < e;
}

/** Days-before-exam milestones that trigger a countdown notification. */
export const EXAM_COUNTDOWNS = [30, 14, 7, 3, 1] as const;

/** Which notification kinds a frequency setting allows. */
export function allowedByFrequency(freq: "low" | "normal" | "high", kind: "streak" | "exam" | "planned" | "competition" | "motivation" | "insight") {
  if (freq === "low") return kind === "streak" || kind === "exam";
  if (freq === "normal") return kind !== "motivation";
  return true;
}
