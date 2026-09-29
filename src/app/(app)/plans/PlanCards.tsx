"use client";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { checkoutAction, pickLaunchPlanAction, portalAction } from "./actions";

type PlanId = "free" | "premium" | "premium_exam";
const PLANS: { id: PlanId; name: string; price: string; tag: string; features: string[]; top?: boolean }[] = [
  { id: "free", name: "Free", price: "$0", tag: "Start here", features: ["Basic AI tutor", "Limited quizzes", "Basic tracking", "Limited exam generation", "Study groups and leaderboards", "Streaks, XP and achievements"] },
  { id: "premium", name: "Premium", price: "$20", tag: "Most popular", features: ["Unlimited AI tutor", "Flashcard generator", "Study planner", "Advanced analytics", "More AI exams", "Everything in Free"] },
  { id: "premium_exam", name: "Premium Exam", price: "$30", tag: "Exam year", top: true, features: ["Unlimited HSC/SAT/AP/IB exam generation", "AI marking", "Full exam simulations", "Detailed feedback", "Performance predictions", "Everything in Premium"] },
];

export function PlanCards({ launchPlan, billing, currentPlan }: { launchPlan: string | null; billing: boolean; currentPlan: PlanId }) {
  const [pick, setPick] = useState(launchPlan);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((p) => (
        <section key={p.id} className={p.top ? "hero-navy flex flex-col p-6" : "card card-pad flex flex-col !p-6"} aria-labelledby={`plan-${p.id}`}>
          <span className={`pill self-start ${p.top ? "pill-yellow" : p.id === "premium" ? "" : "pill-muted"}`}>{p.tag}</span>
          <h2 id={`plan-${p.id}`} className="font-display mt-3 text-2xl font-extrabold">
            {p.name}
          </h2>
          <p className="mt-1">
            <span className="num text-4xl font-bold">{p.price}</span>
            <span className={p.top ? "text-white/75" : "text-ink-3"}>{p.id === "free" ? " forever" : " AUD/month"}</span>
          </p>
          <ul className="mt-4 flex flex-1 flex-col gap-2">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={18} className={`mt-0.5 flex-none ${p.top ? "text-yellow" : "text-good"}`} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2">
            {billing && p.id !== "free" ? (
              currentPlan === p.id ? (
                <button className="btn btn-secondary btn-block" onClick={() => start(() => portalAction())}>
                  Manage subscription
                </button>
              ) : (
                <button className={`btn btn-block ${p.top ? "btn-gold" : "btn-primary"}`} onClick={() => start(() => checkoutAction(p.id as "premium" | "premium_exam"))}>
                  {currentPlan === "free" ? `Get ${p.name}` : `Switch to ${p.name}`}
                </button>
              )
            ) : (
              <button
                className={`btn btn-block ${pick === p.id ? (p.top ? "btn-gold" : "btn-primary") : "btn-secondary"} ${p.top && pick !== p.id ? "!text-ink" : ""}`}
                aria-pressed={pick === p.id}
                onClick={() =>
                  start(async () => {
                    setPick(p.id);
                    await pickLaunchPlanAction(p.id);
                    toast(`Saved: ${p.name} is your pick for launch`);
                  })
                }
              >
                {pick === p.id ? "Your pick for launch ✓" : "Pick for launch"}
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
