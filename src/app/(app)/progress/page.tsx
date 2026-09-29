import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/domain/dates";
import { predictedResult } from "@/lib/domain/bands";
import { getWeakTopics } from "@/lib/server/queries";
import { ProgressCharts } from "./ProgressCharts";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const v = await requireViewer();
  const supabase = await createClient();
  const from = addDays(v.today, -13);
  const [{ data: sessions }, { data: papers }, weak] = await Promise.all([
    supabase.from("study_sessions").select("day, minutes, subject").eq("verified", true),
    supabase.from("papers").select("pct, created_at, config->>subject, paper->>title").eq("status", "marked").order("created_at"),
    getWeakTopics(12),
  ]);
  const all = sessions ?? [];
  const byDay = new Map<string, number>();
  for (const s of all) if (s.day >= from) byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.minutes);
  const minutes = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, label: new Date(`${d}T00:00:00Z`).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }), minutes: byDay.get(d) ?? 0 };
  });
  const bySubject = new Map<string, number>();
  for (const s of all) bySubject.set(s.subject, (bySubject.get(s.subject) ?? 0) + s.minutes);
  const subjectTime = [...bySubject.entries()].map(([subject, m]) => ({ subject, hours: Math.round((m / 60) * 10) / 10 })).sort((a, b) => b.hours - a.hours);

  const marked = (papers ?? []).map((p) => ({ pct: p.pct ?? 0, date: p.created_at.slice(0, 10), subject: p.subject as string, title: p.title as string }));
  const last10 = marked.slice(-10).map((p, i) => ({ ...p, n: i + 1, label: new Date(p.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) }));
  const avg = marked.length ? Math.round(marked.reduce((a, p) => a + p.pct, 0) / marked.length) : null;
  const recent = marked.slice(-3);
  const earlier = marked.slice(0, -3);
  const recentAvg = recent.length ? recent.reduce((a, p) => a + p.pct, 0) / recent.length : null;
  const earlierAvg = earlier.length ? earlier.reduce((a, p) => a + p.pct, 0) / earlier.length : null;
  const trend = recentAvg !== null && earlierAvg !== null ? Math.round(recentAvg - earlierAvg) : null;
  const perf = new Map<string, number[]>();
  for (const p of marked) perf.set(p.subject, [...(perf.get(p.subject) ?? []), p.pct]);
  const subjectPerf = [...perf.entries()].map(([subject, xs]) => ({ subject, pct: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) })).sort((a, b) => b.pct - a.pct);

  const hours14 = Math.round((minutes.reduce((a, d) => a + d.minutes, 0) / 60) * 10) / 10;
  const accuracy = v.profile.questions_answered ? Math.round(v.profile.questions_correct / v.profile.questions_answered * 100) : null;
  const predicted = recentAvg !== null ? predictedResult(recentAvg, v.profile.system ?? "NSW HSC") : null;

  return (
    <ProgressCharts
      tiles={{ hours14, avg, trend, accuracy, answered: v.profile.questions_answered, predicted }}
      minutes={minutes}
      papers={last10}
      subjectTime={subjectTime}
      subjectPerf={subjectPerf}
      weak={weak.map((w) => ({ subject: w.subject, topic: w.topic, misses: w.misses }))}
    />
  );
}
