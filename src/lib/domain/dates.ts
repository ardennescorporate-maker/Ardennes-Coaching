export const DEFAULT_TZ = "Australia/Sydney";

/** Calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function dayKey(at: Date = new Date(), tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Adds whole days to a YYYY-MM-DD key. */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a), both YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD key. */
export function weekdayMon0(key: string): number {
  return (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** Monday of the week containing key. */
export function startOfWeek(key: string): string {
  return addDays(key, -weekdayMon0(key));
}
