import { describe, expect, it } from "vitest";
import { levelFor, levelProgress, xpForLevel } from "@/lib/domain/levels";
import { XP } from "@/lib/domain/xp";
import { applyStudy, displayStreak, streakStatus } from "@/lib/domain/streak";
import { grade, isDue, quizResult } from "@/lib/domain/srs";
import { predictedResult } from "@/lib/domain/bands";
import { CODE_ALPHABET, makeGroupCode, makeInviteCode, normaliseCode, validateUsername } from "@/lib/domain/codes";
import { addDays, dayKey, daysBetween, startOfWeek, weekdayMon0 } from "@/lib/domain/dates";
import { pipTip } from "@/lib/domain/tips";

describe("levels", () => {
  it("follows floor(sqrt(xp/40))+1", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(39)).toBe(1);
    expect(levelFor(40)).toBe(2);
    expect(levelFor(159)).toBe(2);
    expect(levelFor(160)).toBe(3);
    expect(levelFor(3240)).toBe(10);
    expect(levelFor(-5)).toBe(1);
  });
  it("xpForLevel is the inverse threshold", () => {
    for (let l = 1; l < 120; l++) {
      expect(levelFor(xpForLevel(l))).toBe(l);
      if (l > 1) expect(levelFor(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });
  it("reports progress within the level", () => {
    expect(levelProgress(200)).toEqual({ level: 3, into: 40, span: 200, toNext: 160, nextLevelXp: 360 });
  });
});

describe("xp awards", () => {
  it("matches the spec", () => {
    expect(XP.studySession(5)).toBe(10);
    expect(XP.studySession(300)).toBe(240);
    expect(XP.paper(0)).toBe(50);
    expect(XP.paper(75)).toBe(88);
    expect(XP.paper(100)).toBe(100);
    expect(XP.lessonFirst(4)).toBe(50);
    expect(XP.lessonReplay(4)).toBe(18);
    expect(XP.flashcardReview(1)).toBe(5);
    expect(XP.flashcardReview(10)).toBe(20);
    expect(XP.deckQuiz(7)).toBe(45);
  });
});

describe("streaks", () => {
  it("starts, continues, holds and resets", () => {
    let s = applyStudy({ streak: 0, lastStudyDate: null }, "2026-09-01");
    expect(s).toEqual({ streak: 1, lastStudyDate: "2026-09-01" });
    s = applyStudy(s, "2026-09-01");
    expect(s.streak).toBe(1);
    s = applyStudy(s, "2026-09-02");
    expect(s.streak).toBe(2);
    s = applyStudy(s, "2026-09-05");
    expect(s).toEqual({ streak: 1, lastStudyDate: "2026-09-05" });
  });
  it("classifies status", () => {
    const s = { streak: 6, lastStudyDate: "2026-09-10" };
    expect(streakStatus(s, "2026-09-10")).toBe("studied");
    expect(streakStatus(s, "2026-09-11")).toBe("at-risk");
    expect(streakStatus(s, "2026-09-12")).toBe("broken");
    expect(displayStreak(s, "2026-09-12")).toBe(0);
    expect(displayStreak(s, "2026-09-11")).toBe(6);
  });
  it("crosses month boundaries", () => {
    expect(applyStudy({ streak: 3, lastStudyDate: "2026-02-28" }, "2026-03-01").streak).toBe(4);
  });
});

describe("spaced repetition", () => {
  const t = "2026-09-10";
  it("again → box 1 due today", () => expect(grade({ box: 4, due: t }, "again", t)).toEqual({ box: 1, due: t }));
  it("hard → same box, half interval (min 1)", () => {
    expect(grade({ box: 1, due: t }, "hard", t)).toEqual({ box: 1, due: "2026-09-11" });
    expect(grade({ box: 4, due: t }, "hard", t)).toEqual({ box: 4, due: "2026-09-17" });
  });
  it("good → next box", () => expect(grade({ box: 2, due: t }, "good", t)).toEqual({ box: 3, due: "2026-09-17" }));
  it("easy → skips a box, capped at 5", () => {
    expect(grade({ box: 2, due: t }, "easy", t)).toEqual({ box: 4, due: "2026-09-24" });
    expect(grade({ box: 5, due: t }, "easy", t)).toEqual({ box: 5, due: "2026-10-10" });
  });
  it("due check and quiz", () => {
    expect(isDue({ box: 1, due: t }, t)).toBe(true);
    expect(isDue({ box: 1, due: "2026-09-11" }, t)).toBe(false);
    expect(quizResult({ box: 3, due: "2026-09-20" }, false, t)).toEqual({ box: 1, due: t });
  });
});

describe("bands", () => {
  it("maps HSC percentages", () => {
    expect(predictedResult(95, "NSW HSC")).toBe("Band 6");
    expect(predictedResult(90, "NSW HSC")).toBe("Band 6");
    expect(predictedResult(85, "NSW HSC")).toBe("Band 5");
    expect(predictedResult(70, "NSW HSC")).toBe("Band 4");
    expect(predictedResult(60, "NSW HSC")).toBe("Band 3");
    expect(predictedResult(10, "NSW HSC")).toBe("Band 2 or below");
  });
  it("gives other systems a grade", () => {
    expect(predictedResult(95, "A-Level")).toBe("A*");
    expect(predictedResult(80, "IB Diploma")).toBe("7");
  });
});

describe("codes", () => {
  it("makes invite codes in PREFIX-XXXX", () => {
    for (let i = 0; i < 200; i++) {
      const c = makeInviteCode("hsc early!");
      expect(c).toMatch(/^HSCEARLY-[A-Z2-9]{4}$/);
      for (const ch of c.split("-")[1]) expect(CODE_ALPHABET).toContain(ch);
    }
  });
  it("makes group codes from the name", () => expect(makeGroupCode("Year 12 Maths Crew")).toMatch(/^YEAR12-[A-Z2-9]{4}$/));
  it("normalises input", () => expect(normaliseCode("  pilot-2026 ")).toBe("PILOT-2026"));
  it("validates usernames", () => {
    expect(validateUsername("alex.r")).toBeNull();
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("bad name")).not.toBeNull();
    expect(validateUsername("a".repeat(21))).not.toBeNull();
  });
});

describe("dates", () => {
  it("computes keys in Sydney time", () => {
    // 2026-09-29T15:00Z is 1am on the 30th in Sydney (AEST, UTC+10)
    expect(dayKey(new Date("2026-09-29T15:00:00Z"))).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-09-01", "2026-09-29")).toBe(28);
    expect(weekdayMon0("2026-09-28")).toBe(0);
    expect(startOfWeek("2026-10-04")).toBe("2026-09-28");
  });
});

describe("pip tips", () => {
  const base = { streak: 0, streakAtRisk: false, cardsDue: 0 };
  it("picks the first matching rule", () => {
    expect(pipTip({ ...base, streak: 6, streakAtRisk: true, cardsDue: 5 })).toBe("Your 6-day streak needs one session today. Let's take off!");
    expect(pipTip({ ...base, nextExam: { name: "Chemistry trial", daysLeft: 4 }, cardsDue: 3 })).toContain("4 days away");
    expect(pipTip({ ...base, nextExam: { name: "X", daysLeft: 30 }, topWeakTopic: "Logarithm laws" })).toContain("Logarithm laws");
    expect(pipTip({ ...base, cardsDue: 12 })).toBe("12 flashcards are ready for review. Quick five minutes?");
    expect(pipTip(base)).toBe("Ready when you are. Ask me anything about your subjects.");
  });
});

import { BUILTIN_LESSONS } from "@/lib/content/builtinLessons";
import { answerIndex, gradeLesson, starsFor, validateLesson } from "@/lib/domain/lesson";

describe("lessons", () => {
  it("built-in lessons are valid", () => {
    for (const l of Object.values(BUILTIN_LESSONS)) expect(validateLesson(l)).toBeNull();
  });
  it("maps answer letters", () => {
    expect(answerIndex("B", ["a", "b", "c", "d"])).toBe(1);
    expect(answerIndex("(d)", ["a", "b", "c", "d"])).toBe(3);
    expect(answerIndex("c", ["a", "b", "c", "d"])).toBe(2);
  });
  it("awards stars", () => {
    expect([starsFor(4, 4), starsFor(3, 4), starsFor(2, 4), starsFor(0, 4)]).toEqual([3, 2, 1, 1]);
  });
  it("grades on the server's answer key", () => {
    const l = BUILTIN_LESSONS["Mathematics Advanced|What is a function?"];
    expect(gradeLesson(l, [1, 0, 2, 1])).toMatchObject({ correct: 4, stars: 3 });
    expect(gradeLesson(l, [1, 0, 2, null])).toMatchObject({ correct: 3, stars: 2, results: [true, true, true, false] });
  });
});
