import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { getExams, getHomework, getWeakTopics } from "@/lib/server/queries";
import { planWeek, type PlanHours } from "@/lib/domain/planner";
import { addDays } from "@/lib/domain/dates";
import { PlannerClient } from "./PlannerClient";
import type { Timeline } from "./actions";

export const metadata: Metadata = { title: "Planner" };

export default async function PlannerPage() {
  const v = await requireViewer();
  const supabase = await createClient();
  const [exams, homework, weak, { data: timeline }, { data: studied }] = await Promise.all([
    getExams(),
    getHomework(),
    getWeakTopics(20),
    supabase.from("revision_timelines").select("content, created_at").maybeSingle(),
    supabase.from("study_sessions").select("day").eq("verified", true).gte("day", addDays(v.today, -120)),
  ]);
  const hours = v.profile.plan_hours as PlanHours;
  const week = planWeek({
    today: v.today,
    hours,
    subjects: v.profile.subjects,
    exams: exams.map((e) => ({ subject: e.subject, date: e.date })),
    homework: homework.map((h) => ({ id: h.id, subject: h.subject, task: h.task, due: h.due, done: Boolean(h.done_at) })),
    weak: weak.map((w) => ({ subject: w.subject, topic: w.topic, misses: w.misses })),
  });
  return (
    <PlannerClient
      today={v.today}
      subjects={v.profile.subjects}
      hours={hours}
      week={week}
      exams={exams}
      homework={homework}
      timeline={(timeline?.content as Timeline) ?? null}
      studiedDays={[...new Set((studied ?? []).map((s) => s.day))]}
    />
  );
}
