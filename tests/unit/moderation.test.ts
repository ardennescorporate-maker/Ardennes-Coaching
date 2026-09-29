import { describe, expect, it } from "vitest";
import { checkAnnouncement, containsProfanity } from "@/lib/domain/moderation";

describe("moderation", () => {
  it("catches swears and simple disguises", () => {
    expect(containsProfanity("this is sh1t")).toBe(true);
    expect(containsProfanity("F*CK this")).toBe(true);
    expect(containsProfanity("absolute bullshit")).toBe(true);
  });
  it("allows normal study talk (no Scunthorpe problem)", () => {
    expect(containsProfanity("Let's assess the class and pass the exam")).toBe(false);
    expect(containsProfanity("Dickens essay due Friday")).toBe(false);
  });
  it("checks length, links and emptiness", () => {
    expect(checkAnnouncement("  ")).not.toBeNull();
    expect(checkAnnouncement("x".repeat(501))).not.toBeNull();
    expect(checkAnnouncement("see https://spam.example")).not.toBeNull();
    expect(checkAnnouncement("Trial next week, do a paper!")).toBeNull();
  });
});
