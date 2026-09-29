import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarClock, Clock, Flame, Layers, Trophy } from "lucide-react";
import { requireViewer } from "@/lib/viewer";
import { levelProgress } from "@/lib/domain/levels";
import { addDays } from "@/lib/domain/dates";
import { displayStreak, streakStatus } from "@/lib/domain/streak";
import { pipTip } from "@/lib/domain/tips";
import { planWeek, type PlanHours } from "@/lib/domain/planner";
import { cardsDueCount, getExams, getHomework, getWeakTopics, leaderboard, myGroups, nextLesson, sessionStats, upcomingExams, xpLast7Days } from "@/lib/server/queries";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pip } from "@/components/pip/Pip";
import { Avatar } from "@/components/shell/Avatar";
import { PLANS } from "@/lib/domain/plans";
import { Hero } from "./Hero";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const v = await requireViewer();
  const p = v.profile;
  const [exams, homework, due, weak, week, stats, next, groups] = await Promise.all([
    getExams(),
    getHomework(),
    cardsDueCount(v.today),
    getWeakTopics(8),
    xpLast7Days(v.today),
    sessionStats(),
    nextLesson(p.subjects),
    myGroups(),
  ]);
  const group = groups[0] ?? null;
  const board = group ? await leaderboard(group.id, "week", v) : [];
  const myRank = board.findIndex((r) => r.isYou) + 1;

  const streakState = { streak: p.streak, lastStudyDate: p.last_study_date };
  const status = streakStatus(streakState, v.today);
  const streak = displayStreak(streakState, v.today);
  const upcoming = upcomingExams(exams, v.today);
  const tip = pipTip({
    streak,
    streakAtRisk: status === "at-risk",
    nextExam: upcoming[0] ? { name: upcoming[0].name, daysLeft: upcoming[0].daysLeft } : null,
    topWeakTopic: weak[0]?.topic ?? null,
    cardsDue: due,
  });
  const lp = levelProgress(p.xp);
  const plan = planWeek({
    today: v.today,
    hours: p.plan_hours as PlanHours,
    subjects: p.subjects,
    exams: exams.map((e) => ({ subject: e.subject, date: e.date })),
    homework: homework.map((h) => ({ id: h.id, subject: h.subject, task: h.task, due: h.due, done: Boolean(h.done_at) })),
    weak: weak.map((w) => ({ subject: w.subject, topic: w.topic, misses: w.misses })),
  });
  const todayPlan = plan.find((d) => d.date === v.today)?.blocks ?? [];
  const hwDue = homework.filter((h) => !h.done_at && h.due <= addDays(v.today, 2));
  const weekTotal = week.reduce((a, d) => a + d.xp, 0);
  const maxDay = Math.max(20, ...week.map((d) => d.xp));
  const dateLabel = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: p.timezone }).format(new Date());
  const streakLine =
    status === "studied"
      ? `${streak}-day streak, and you've studied today. Smooth flying!${p.goal ? ` Goal: ${p.goal}.` : ""}`
      : status === "at-risk"
        ? `Your ${streak}-day streak is at risk. One session today keeps it alive.`
        : `Study today to start a new streak.${p.goal ? ` Goal: ${p.goal}.` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <Hero
        username={p.username ?? "there"}
        dateLabel={dateLabel}
        tip={tip}
        level={lp.level}
        into={lp.into}
        span={lp.span}
        toNext={lp.toNext}
        studiedToday={status === "studied"}
        streakLine={streakLine}
        subjects={p.subjects}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile highlight icon={<Flame size={20} />} label="Study streak" value={`${streak}`} sub={streak === 1 ? "day" : "days"} />
        <Tile icon={<Clock size={20} />} label="Hours studied" value={(p.study_minutes / 60).toFixed(1)} sub={`${stats.sessions} sessions`} />
        <Tile icon={<Layers size={20} />} label="Cards due" value={`${due}`} sub={due ? <Link className="font-extrabold text-blue-ink" href="/flashcards">Review now</Link> : "All caught up"} />
        <Tile icon={<Trophy size={20} />} label="Group rank" value={myRank ? `#${myRank}` : "—"} sub={group ? group.name : <Link className="font-extrabold text-blue-ink" href="/groups">Join a group</Link>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="XP this week" action={<span className="pill pill-yellow num">{weekTotal.toLocaleString()} XP</span>} />
          <div className="flex h-40 items-end gap-2" role="img" aria-label={`XP over the last 7 days: ${week.map((d) => `${weekdayShort(d.date)} ${d.xp}`).join(", ")}`}>
            {week.map((d) => {
              const today = d.date === v.today;
              return (
                <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={`num text-[11px] ${today ? "font-bold text-ink" : "text-ink-3"}`}>{d.xp || ""}</span>
                  <div
                    className={`w-full max-w-10 rounded-t-lg ${today ? "bg-yellow" : "bg-blue-soft"}`}
                    style={{ height: `${Math.max(4, (d.xp / maxDay) * 100)}%`, boxShadow: today ? "inset 0 2px 0 rgba(255,255,255,.5)" : undefined }}
                  />
                  <span className={`text-xs ${today ? "font-extrabold text-ink" : "text-ink-3"}`}>{weekdayShort(d.date)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Exam countdowns" action={<Link href="/planner#exams" className="btn btn-ghost btn-sm">Manage</Link>} />
          {upcoming.length === 0 ? (
            <p className="text-ink-3">
              No exams yet. <Link href="/planner#exams" className="font-extrabold text-blue-ink">Add your exam dates</Link> and Pip will plan around them.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                  <span className={`pill num ${e.daysLeft <= 7 ? "pill-bad" : e.daysLeft <= 21 ? "pill-warn" : "pill-muted"}`}>{e.daysLeft}d</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{e.name}</span>
                    <span className="block text-xs text-ink-3">
                      {e.subject} · {new Date(`${e.date}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Today's plan" action={<Link href="/planner" className="btn btn-ghost btn-sm">Planner</Link>} />
          {todayPlan.length === 0 && hwDue.length === 0 ? (
            <p className="text-ink-3">Nothing planned today. Set your available hours in the Planner.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayPlan.map((b, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border-l-4 border-blue bg-surface-2 px-3 py-2">
                  <CalendarClock size={18} className="mt-0.5 flex-none text-blue-ink" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-extrabold">
                      {b.subject} <span className="num text-sm font-bold text-ink-3">· {b.minutes} min</span>
                    </span>
                    <span className="block text-sm text-ink-2">{b.focus}</span>
                  </span>
                </li>
              ))}
              {hwDue
                .filter((h) => !todayPlan.some((b) => b.focus === `Homework: ${h.task}`))
                .map((h) => (
                  <li key={h.id} className="flex items-center gap-3 rounded-xl bg-yellow-soft px-3 py-2 text-sm">
                    <span className="font-extrabold">Homework:</span> <span className="truncate">{h.task}</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Weekly leaderboard" sub={group?.name} action={<Link href="/groups" className="btn btn-ghost btn-sm">Groups</Link>} />
          {!group ? (
            <div className="flex items-center gap-3">
              <Pip mood="think" size={70} animation="none" />
              <p className="text-ink-2">
                Join or create a study group to compete with friends. <Link href="/groups" className="font-extrabold text-blue-ink">Find a group</Link>
              </p>
            </div>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {board
                .map((r, i) => ({ ...r, rank: i + 1 }))
                .filter((r) => r.rank <= 5 || r.isYou)
                .map((r) => (
                <li key={r.key} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${r.isYou ? "bg-blue-soft" : ""}`}>
                  <span className="num w-5 text-center font-bold text-ink-3">{r.rank}</span>
                  <Avatar name={r.username} colour={r.avatarColour} size={28} />
                  <span className="min-w-0 flex-1 truncate font-extrabold">
                    {r.username}
                    {r.isYou && <span className="font-bold text-blue-ink"> (you)</span>}
                  </span>
                  <span className="num text-sm font-bold">{r.xp.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader title="Continue learning" />
          {next ? (
            <div className="flex gap-3">
              <Pip mood="talk" size={80} />
              <div className="min-w-0">
                <p className="micro text-ink-3">
                  {next.course} · {next.done}/{next.total}
                </p>
                <p className="font-display mt-1 text-lg font-bold leading-tight">{next.lesson}</p>
                <p className="text-sm text-ink-3">{next.unit}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/lessons/${next.courseSlug}/${next.lessonSlug}`} className="btn btn-primary btn-sm">
                    <BookOpen size={16} /> Start lesson
                  </Link>
                  <Link href="/lessons" className="btn btn-ghost btn-sm">
                    All courses
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-ink-3">
              You&apos;ve finished every lesson in your courses. <Link href="/lessons" className="font-extrabold text-blue-ink">Add a course</Link>
            </p>
          )}
        </Card>
      </div>

      <Card className="!bg-yellow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="micro text-ink-3">Your plan</p>
            <p className="font-display text-xl font-extrabold">BETA ALL-ACCESS</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.values(PLANS).map((pl) => (
                <span key={pl.name} className={`pill ${pl.name === "Premium Exam" ? "" : "pill-muted"}`}>
                  {pl.name}
                </span>
              ))}
            </div>
          </div>
          <Link href="/plans" className="btn btn-secondary">
            Compare plans
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Tile({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`card card-pad ${highlight ? "!border-blue-deep !bg-blue-fill text-white !shadow-[0_4px_0_var(--blue-deep)]" : ""}`}>
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${highlight ? "bg-white/20" : "bg-blue-soft text-blue-ink"}`}>{icon}</span>
        <span className={`micro ${highlight ? "text-white" : "text-ink-3"}`}>{label}</span>
      </div>
      <p className="num mt-2 text-3xl font-bold">{value}</p>
      <p className={`text-sm ${highlight ? "text-white" : "text-ink-3"}`}>{sub}</p>
    </div>
  );
}

function weekdayShort(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", timeZone: "UTC" });
}
