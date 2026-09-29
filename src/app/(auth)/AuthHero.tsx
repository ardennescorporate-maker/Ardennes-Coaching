"use client";
import { usePathname } from "next/navigation";
import { Pip } from "@/components/pip/Pip";

const LINES: Record<string, string> = {
  "/signup/verify": "Check your inbox! I've sent you a 6-digit code.",
  "/signup/invite": "StudyPilot is in private beta. Pop in your invite code and we're cleared for take-off!",
  "/signup/profile": "Tell me about your studies so I can plan the perfect flight path.",
  "/login/mfa": "Just one more check to keep your account safe.",
  "/forgot": "No worries, it happens to the best of us. Let's get you back in.",
  "/forgot/reset": "Enter the code from your email and choose a new password.",
};

export function AuthHero() {
  const path = usePathname();
  const line = LINES[path] ?? "G'day, I'm Pip, your study bird! I'll teach you step by step, quiz you, mark your practice papers and keep your streak flying.";
  return (
    <section className="flex flex-row items-center gap-4 lg:flex-col lg:items-start lg:gap-6 lg:pt-8" aria-label="Welcome">
      <div className="flex-none">
        <div className="lg:hidden">
          <Pip mood="wave" size={104} />
        </div>
        <div className="hidden lg:block">
          <Pip mood="wave" size={260} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="bubble bubble-left text-sm lg:hidden">{line}</p>
        <p className="bubble bubble-bottom hidden max-w-md text-lg lg:block">{line}</p>
        <h2 className="font-display mt-6 hidden text-4xl font-extrabold leading-tight lg:block">
          Study smarter.
          <br />
          <span className="text-blue">Fly higher.</span>
        </h2>
        <p className="mt-2 hidden max-w-md text-ink-2 lg:block">Lessons, practice papers with AI marking, flashcards and a planner for the HSC, SAT, AP, GCSE, A-Level and IB.</p>
      </div>
    </section>
  );
}
