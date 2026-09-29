import { describe, expect, it } from "vitest";
import { evaluate, format } from "@/lib/domain/calc";

describe("calculator", () => {
  it("respects precedence and associativity", () => {
    expect(evaluate("2+3×4")).toBe(14);
    expect(evaluate("(2+3)×4")).toBe(20);
    expect(evaluate("2^3^2")).toBe(512);
    expect(evaluate("-2^2")).toBe(-4);
    expect(evaluate("10÷4")).toBe(2.5);
    expect(evaluate("7-2-1")).toBe(4);
  });
  it("handles functions in both angle modes", () => {
    expect(evaluate("sin(30)", "DEG")).toBeCloseTo(0.5);
    expect(evaluate("cos(π)", "RAD")).toBeCloseTo(-1);
    expect(evaluate("sin(180)", "DEG")).toBe(0);
    expect(evaluate("ln(e)")).toBeCloseTo(1);
    expect(evaluate("log(1000)")).toBeCloseTo(3);
    expect(evaluate("√16+1")).toBe(5);
  });
  it("supports implicit multiplication, ANS and a missing close bracket", () => {
    expect(evaluate("2π", "RAD")).toBeCloseTo(2 * Math.PI);
    expect(evaluate("3(4+1)")).toBe(15);
    expect(evaluate("ANS×2", "DEG", 21)).toBe(42);
    expect(evaluate("2×(3+4")).toBe(14);
  });
  it("rejects bad input and never runs code", () => {
    expect(() => evaluate("1÷0")).toThrow(/divide by zero/);
    expect(() => evaluate("ln(-1)")).toThrow();
    expect(() => evaluate("alert(1)")).toThrow();
    expect(() => evaluate("2++")).toThrow();
    expect(() => evaluate("tan(90)", "DEG")).toThrow(/undefined/);
  });
  it("formats results", () => {
    expect(format(0.1 + 0.2)).toBe("0.3");
    expect(format(12)).toBe("12");
  });
});
