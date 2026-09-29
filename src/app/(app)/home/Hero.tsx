"use client";
import Link from "next/link";
import { useState } from "react";
import { Pip } from "@/components/pip/Pip";
import { XpBar } from "@/components/ui/XpBar";
import { LogStudyForm } from "./LogStudy";

export function Hero(props: {
  username: string;
  dateLabel: string;
  tip: string;
  level: number;
  into: number;
  span: number;
  toNext: number;
  studiedToday: boolean;
  streakLine: string;
  subjects: string[];
}) {
  const [logging, setLogging] = useState(false);
  return (
    <section className="hero-navy relative overflow-hidden p-5 sm:p-7" aria-labelledby="welcome">
      <div className="grid items-center gap-5 md:grid-cols-[auto_1fr]">
        <div className="flex items-end gap-4 md:flex-col md:items-center">
          <Pip mood={props.studiedToday ? "cheer" : "wave"} size={150} />
        </div>
        <div className="min-w-0">
          <p className="micro text-white/70">{props.dateLabel}</p>
          <div className="mt-2 rounded-2xl bg-white/12 px-4 py-3 text-[15px] font-bold backdrop-blur-sm" style={{ background: "rgba(255,255,255,.12)" }}>
            <span className="micro mr-2 text-yellow">Pip says</span>
            {props.tip}
          </div>
          <h2 id="welcome" className="font-display mt-4 text-3xl font-extrabold sm:text-4xl">
            Welcome back, {props.username}.
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="pill pill-yellow num">Level {props.level}</span>
            <div className="min-w-[160px] flex-1">
              <XpBar value={props.into} max={props.span} label="XP to next level" />
            </div>
            <span className="num text-sm text-white/75">{props.toNext.toLocaleString()} XP to L{props.level + 1}</span>
          </div>
          <p className="mt-2 text-sm text-white/80">{props.streakLine}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link href="/tools?focus=1" className="btn btn-gold">
              Start a focus session
            </Link>
            <Link href="/papers" className="btn btn-secondary !text-ink">
              Generate a practice paper
            </Link>
            <button type="button" className="btn btn-ghost !text-white hover:!bg-white/10" aria-expanded={logging} onClick={() => setLogging((x) => !x)}>
              Log verified study
            </button>
          </div>
        </div>
      </div>
      {logging && (
        <div className="mt-5">
          <LogStudyForm subjects={props.subjects} dark onDone={() => setLogging(false)} />
        </div>
      )}
    </section>
  );
}
