import { describe, expect, it } from "vitest";
import { allowedByFrequency, inQuietHours, localParts } from "@/lib/domain/schedule";

describe("schedule", () => {
  it("reads local time in Sydney", () => {
    expect(localParts(new Date("2026-09-29T06:30:00Z"), "Australia/Sydney")).toMatchObject({ date: "2026-09-29", hour: 16, minute: 30, weekday: "Tue" });
  });
  it("handles quiet hours across midnight", () => {
    expect(inQuietHours("23:15", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("06:59", "22:00", "07:00")).toBe(true);
    expect(inQuietHours("07:00", "22:00", "07:00")).toBe(false);
    expect(inQuietHours("16:30", "22:00", "07:00")).toBe(false);
    expect(inQuietHours("13:00", "12:00", "14:00")).toBe(true);
  });
  it("filters by frequency", () => {
    expect(allowedByFrequency("low", "streak")).toBe(true);
    expect(allowedByFrequency("low", "competition")).toBe(false);
    expect(allowedByFrequency("normal", "motivation")).toBe(false);
    expect(allowedByFrequency("high", "motivation")).toBe(true);
  });
});
