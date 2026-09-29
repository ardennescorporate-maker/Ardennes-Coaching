"use client";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pip } from "@/components/pip/Pip";
import { useRewards } from "@/components/rewards/Rewards";
import { useToast } from "@/components/ui/Toast";
import { WEEKDAYS, type PlanDay, type PlanHours } from "@/lib/domain/planner";
import { addDays, daysBetween, weekdayMon0 } from "@/lib/domain/dates";
import type { Exam, Homework } from "@/lib/server/queries";
import { addExamAction, addHomeworkAction, deleteHomeworkAction, generateTimelineAction, removeExamAction, saveHoursAction, toggleHomeworkAction, type Timeline } from "./actions";

const DAY_LABEL: Record<string, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
/** Subject colours: shades of blue, navy and yellow only. */
const SHADES = ["#2F7BF5", "#17307A", "#E0A100", "#5FA0FF", "#1B5CCB", "#FFC226", "#0E1F55", "#8EC0FF"];

export function PlannerClient(p: { today: string; subjects: string[]; hours: PlanHours; week: PlanDay[]; exams: Exam[]; homework: Homework[]; timeline: Timeline | null; studiedDays: string[] }) {
  const colour = (s: string) => SHADES[Math.max(0, p.subjects.indexOf(s)) % SHADES.length];
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="This week" sub="Pip plans around your exams, homework and weak topics." />
        <div className="scroll-x -mx-1 px-1">
          <div className="grid min-w-[760px] grid-cols-7 gap-2">
            {p.week.map((d) => {
              const today = d.date === p.today;
              return (
                <div key={d.date} className={`flex min-h-[180px] flex-col gap-1.5 rounded-2xl border-2 p-2 ${today ? "border-blue bg-blue-soft" : "border-line"}`}>
                  <p className={`text-center text-sm font-extrabold ${today ? "text-blue" : ""}`}>
                    {DAY_LABEL[d.weekday]} <span className="num font-bold text-ink-3">{Number(d.date.slice(8))}</span>
                  </p>
                  {d.blocks.length === 0 && <p className="text-center text-xs text-ink-3">Rest day</p>}
                  {d.blocks.map((b, i) => (
                    <div key={i} className="rounded-xl bg-surface p-1.5 text-xs shadow-sm" style={{ borderLeft: `4px solid ${colour(b.subject)}` }}>
                      <p className="font-extrabold leading-tight">{b.subject}</p>
                      <p className="num text-ink-3">{b.minutes} min</p>
                      <p className="leading-tight text-ink-2">{b.focus}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <HoursCard hours={p.hours} />
        <TimelineCard timeline={p.timeline} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ExamsCard exams={p.exams} subjects={p.subjects} today={p.today} />
        <HomeworkCard homework={p.homework} subjects={p.subjects} today={p.today} />
      </div>

      <CalendarCard today={p.today} exams={p.exams} homework={p.homework} studied={p.studiedDays} />
    </div>
  );
}

function HoursCard({ hours }: { hours: PlanHours }) {
  const [h, setH] = useState(hours);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <Card>
      <CardHeader title="Available hours" sub="How long you can study each day (0–6h)." />
      <div className="flex flex-col gap-2.5">
        {WEEKDAYS.map((d) => (
          <label key={d} className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <span className="font-extrabold">{DAY_LABEL[d]}</span>
            <input type="range" min={0} max={6} step={0.5} value={h[d]} onChange={(e) => setH({ ...h, [d]: Number(e.target.value) })} className="accent-[var(--blue)]" aria-label={`${DAY_LABEL[d]} hours`} />
            <span className="num text-right font-bold">{h[d]}h</span>
          </label>
        ))}
      </div>
      <button
        className="btn btn-primary btn-sm mt-4"
        onClick={() =>
          start(async () => {
            await saveHoursAction(h);
            toast("Hours saved. Pip re-planned your week.");
          })
        }
      >
        Save and re-plan
      </button>
    </Card>
  );
}

function TimelineCard({ timeline }: { timeline: Timeline | null }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader
        title="AI revision timeline"
        sub="A week-by-week plan up to your last exam."
        action={
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => setError((await generateTimelineAction()).error ?? ""))}>
            <Sparkles size={15} /> {timeline ? "Refresh" : "Create"}
          </button>
        }
      />
      {pending ? (
        <div className="flex items-center gap-3 py-4">
          <Pip mood="think" size={60} animation="tilt" />
          <p className="font-bold">Pip is planning your revision…</p>
        </div>
      ) : timeline ? (
        <div className="flex flex-col gap-3">
          <ol className="flex flex-col gap-2">
            {timeline.weeks.map((w) => (
              <li key={w.label} className="rounded-xl bg-surface-2 p-3">
                <p className="font-extrabold">
                  {w.label}: <span className="font-bold text-blue">{w.focus}</span>
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm text-ink-2">
                  {w.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="rounded-xl bg-yellow-soft p-3 text-sm">
            <p className="font-extrabold">Pip&apos;s tips</p>
            <ul className="mt-1 list-disc pl-5">
              {timeline.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-ink-3">Add your exams, then let Pip write a revision timeline with your weak topics first.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad">
          {error}
        </p>
      )}
    </Card>
  );
}

function ExamsCard({ exams, subjects, today }: { exams: Exam[]; subjects: string[]; today: string }) {
  const [form, setForm] = useState({ name: "", subject: subjects[0] ?? "", date: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const upcoming = exams.filter((e) => e.date >= today);
  return (
    <Card id="exams">
      <CardHeader title="Exams" />
      <form
        className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addExamAction(form);
            if (r.error) return setError(r.error);
            setError("");
            setForm({ ...form, name: "", date: "" });
          });
        }}
      >
        <input className="field sm:col-span-3" placeholder="Exam name" aria-label="Exam name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="field" aria-label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input className="field num" type="date" aria-label="Exam date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <button className="btn btn-primary" disabled={pending}>
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm font-bold text-bad">{error}</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {upcoming.length === 0 && <li className="text-ink-3">No upcoming exams.</li>}
        {upcoming.map((e) => {
          const d = daysBetween(today, e.date);
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <span className={`pill num ${d <= 7 ? "pill-bad" : d <= 21 ? "pill-warn" : "pill-muted"}`}>{d}d</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{e.name}</span>
                <span className="block text-xs text-ink-3">
                  {e.subject} · {e.date}
                </span>
              </span>
              <button className="icon-btn !h-9 !w-9 hover:!text-bad" aria-label={`Remove ${e.name}`} onClick={() => start(() => removeExamAction(e.id))}>
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function HomeworkCard({ homework, subjects, today }: { homework: Homework[]; subjects: string[]; today: string }) {
  const [form, setForm] = useState({ task: "", subject: subjects[0] ?? "", due: today });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const celebrate = useRewards();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const isDone = (h: Homework) => optimistic[h.id] ?? Boolean(h.done_at);
  const sorted = [...homework].sort((a, b) => Number(Boolean(a.done_at)) - Number(Boolean(b.done_at)) || a.due.localeCompare(b.due));
  return (
    <Card>
      <CardHeader title="Homework" sub="Tick tasks off for +15 XP each." />
      <form
        className="grid gap-2 sm:grid-cols-[1fr_150px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addHomeworkAction(form);
            if (r.error) return setError(r.error);
            setError("");
            setForm({ ...form, task: "" });
          });
        }}
      >
        <input className="field sm:col-span-3" placeholder="Task" aria-label="Homework task" maxLength={160} value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} required />
        <select className="field" aria-label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input className="field num" type="date" aria-label="Due date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} required />
        <button className="btn btn-primary" disabled={pending}>
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm font-bold text-bad">{error}</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.length === 0 && <li className="text-ink-3">No homework. Nice!</li>}
        {sorted.map((h) => {
          const done = isDone(h);
          const overdue = !done && h.due < today;
          const dueToday = !done && h.due === today;
          return (
            <li key={h.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${overdue ? "bg-bad-soft" : dueToday ? "bg-warn-soft" : "bg-surface-2"}`}>
              <input
                type="checkbox"
                className="h-5 w-5 flex-none accent-[var(--good)]"
                checked={done}
                aria-label={`Mark ${h.task} ${done ? "not done" : "done"}`}
                onChange={(e) => {
                  const next = e.target.checked;
                  setOptimistic((o) => ({ ...o, [h.id]: next }));
                  start(async () => {
                    const r = await toggleHomeworkAction(h.id, next);
                    if (r) celebrate(r, "Homework done!");
                  });
                }}
              />
              <span className={`min-w-0 flex-1 ${done ? "text-ink-3 line-through" : ""}`}>
                <span className="block truncate font-extrabold">{h.task}</span>
                <span className={`block text-xs ${overdue ? "font-bold text-bad" : dueToday ? "font-bold text-warn" : "text-ink-3"}`}>
                  {h.subject} · {overdue ? "Overdue" : dueToday ? "Due today" : `Due ${h.due}`}
                </span>
              </span>
              <button className="icon-btn !h-9 !w-9 hover:!text-bad" aria-label={`Delete ${h.task}`} onClick={() => start(() => deleteHomeworkAction(h.id))}>
                <Trash2 size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function CalendarCard({ today, exams, homework, studied }: { today: string; exams: Exam[]; homework: Homework[]; studied: string[] }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const first = `${month}-01`;
  const start = addDays(first, -weekdayMon0(first));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const studiedSet = new Set(studied);
  const shift = (n: number) => {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  const label = new Date(`${first}T00:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <Card>
      <CardHeader
        title="Calendar"
        action={
          <div className="flex items-center gap-2">
            <button className="icon-btn !h-9 !w-9" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[130px] text-center font-extrabold">{label}</span>
            <button className="icon-btn !h-9 !w-9" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="micro py-1 text-ink-3">
            {DAY_LABEL[d]}
          </span>
        ))}
        {days.map((d) => {
          const inMonth = d.startsWith(month);
          const ex = exams.filter((e) => e.date === d);
          const hw = homework.filter((h) => h.due === d);
          return (
            <div key={d} className={`min-h-[64px] rounded-xl border-2 p-1 text-left text-[11px] ${d === today ? "border-blue" : "border-transparent"} ${inMonth ? "bg-surface-2" : "opacity-40"}`}>
              <span className="num block text-xs font-bold">{Number(d.slice(8))}</span>
              {studiedSet.has(d) && <span className="block truncate rounded bg-good-soft px-1 font-bold text-good">Studied</span>}
              {ex.map((e) => (
                <span key={e.id} className="mt-0.5 block truncate rounded bg-bad-soft px-1 font-bold text-bad" title={e.name}>
                  {e.name}
                </span>
              ))}
              {hw.map((h) => (
                <span key={h.id} className="mt-0.5 block truncate rounded bg-yellow-soft px-1 font-bold" title={h.task}>
                  {h.task}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
