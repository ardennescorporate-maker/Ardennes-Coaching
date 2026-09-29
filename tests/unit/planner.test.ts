import { describe, expect, it } from "vitest";
import { DEFAULT_HOURS, examWeight, planWeek } from "@/lib/domain/planner";

const base = { today: "2026-09-30", hours: DEFAULT_HOURS, subjects: ["Mathematics Advanced", "Chemistry", "Economics"], exams: [], homework: [], weak: [] };

describe("planner", () => {
  it("plans Monday to Sunday of the current week", () => {
    const w = planWeek(base);
    expect(w.map((d) => d.date)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  it("stays within available time and 4 blocks a day", () => {
    const w = planWeek({ ...base, hours: { ...DEFAULT_HOURS, sat: 6, fri: 0.3 } });
    for (const d of w) {
      const cap = Math.round((d.weekday === "sat" ? 6 : d.weekday === "fri" ? 0.3 : DEFAULT_HOURS[d.weekday]) * 60);
      expect(d.blocks.reduce((a, b) => a + b.minutes, 0)).toBeLessThanOrEqual(cap);
      expect(d.blocks.length).toBeLessThanOrEqual(4);
      for (const b of d.blocks) expect(b.minutes).toBeGreaterThanOrEqual(18);
    }
    expect(w.find((d) => d.weekday === "fri")!.blocks).toHaveLength(0); // 18 min < 25 min minimum
  });

  it("puts homework due within 2 days first, once", () => {
    const w = planWeek({ ...base, homework: [{ id: "h1", subject: "Chemistry", task: "Prac report", due: "2026-10-01" }] });
    const days = w.filter((d) => d.blocks.some((b) => b.kind === "homework"));
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe("2026-09-29");
    expect(days[0].blocks[0]).toMatchObject({ kind: "homework", minutes: 30, focus: "Homework: Prac report" });
  });

  it("favours subjects with a near exam and uses 60-minute past-paper blocks", () => {
    const w = planWeek({ ...base, exams: [{ subject: "Economics", date: "2026-10-02" }] });
    const wed = w.find((d) => d.date === "2026-09-30")!;
    expect(wed.blocks[0]).toMatchObject({ subject: "Economics", minutes: 60, focus: "Past-paper practice under timed conditions" });
  });

  it("targets weak areas when no exam is close", () => {
    const w = planWeek({ ...base, subjects: ["Chemistry"], weak: [{ subject: "Chemistry", topic: "Keq", misses: 3 }] });
    expect(w[0].blocks[0].focus).toBe("Weak area: Keq");
  });

  it("weights exams by distance", () => {
    expect([examWeight(3), examWeight(10), examWeight(30), examWeight(60), examWeight(null)]).toEqual([4, 2.5, 1.4, 0, 0]);
  });
});
