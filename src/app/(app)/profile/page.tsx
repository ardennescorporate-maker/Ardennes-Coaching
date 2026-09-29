import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Check, Clock, Crown, FileText, Flame, Hourglass, Layers, Lock, Plane, Rocket, Trophy } from "lucide-react";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { levelProgress } from "@/lib/domain/levels";
import { displayStreak } from "@/lib/domain/streak";
import { getExams, leaderboard, myGroups, upcomingExams } from "@/lib/server/queries";
import { Card, CardHeader } from "@/components/ui/Card";
import { XpBar } from "@/components/ui/XpBar";
import { Avatar } from "@/components/shell/Avatar";

export const metadata: Metadata = { title: "Profile" };

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  clock: Clock,
  flame: Flame,
  check: Check,
  trophy: Trophy,
  hourglass: Hourglass,
  crown: Crown,
  layers: Layers,
  file: FileText,
  plane: Plane,
  rocket: Rocket,
  bug: Bug,
};

export default async function ProfilePage() {
  const v = await requireViewer();
  const p = v.profile;
  const supabase = await createClient();
  const [{ data: all }, { data: mine }, exams, groups, { data: challenges }] = await Promise.all([
    supabase.from("achievements").select("*").order("sort"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at"),
    getExams(),
    myGroups(),
    supabase.from("challenges").select("title, ends_on, winner_id, settled_at").not("settled_at", "is", null).order("ends_on", { ascending: false }).limit(5),
  ]);
  const unlocked = new Map((mine ?? []).map((r) => [r.achievement_id, r.unlocked_at]));
  const lp = levelProgress(p.xp);
  const streak = displayStreak({ streak: p.streak, lastStudyDate: p.last_study_date }, v.today);
  const board = groups[0] ? await leaderboard(groups[0].id, "all", v) : [];
  const rank = board.findIndex((r) => r.isYou) + 1;
  const upcoming = upcomingExams(exams, v.today).slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={p.username ?? "?"} colour={p.avatar_colour} url={p.avatar_url} size={84} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-3xl font-extrabold">{p.username}</h2>
              {v.isBeta && <span className="beta-tag !text-xs">BETA TESTER</span>}
              <span className={`pill ${p.privacy.publicProfile ? "pill-good" : "pill-muted"}`}>{p.privacy.publicProfile ? "Public" : "Private"}</span>
            </div>
            <p className="text-ink-2">
              {p.year_level} · {p.system} · {p.country}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.subjects.map((s) => (
                <span key={s} className="pill">
                  {s}
                </span>
              ))}
            </div>
            {p.goal && <p className="mt-2 text-sm font-bold">Goal: {p.goal}</p>}
          </div>
          <Link href="/settings/profile" className="btn btn-secondary btn-sm">
            Edit profile
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="micro text-ink-3">Level</p>
          <p className="num text-3xl font-bold">{lp.level}</p>
          <XpBar className="mt-2" value={lp.into} max={lp.span} />
          <p className="num mt-1 text-xs text-ink-3">{p.xp.toLocaleString()} XP total</p>
        </Card>
        <Card>
          <p className="micro text-ink-3">Streak</p>
          <p className="num text-3xl font-bold">{streak}</p>
          <p className="text-sm text-ink-3">days</p>
        </Card>
        <Card>
          <p className="micro text-ink-3">Study hours</p>
          <p className="num text-3xl font-bold">{(p.study_minutes / 60).toFixed(1)}</p>
          <p className="text-sm text-ink-3">verified</p>
        </Card>
        <Card>
          <p className="micro text-ink-3">Leaderboard rank</p>
          <p className="num text-3xl font-bold">{rank ? `#${rank}` : "—"}</p>
          <p className="truncate text-sm text-ink-3">{groups[0]?.name ?? "No group yet"}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Achievements" sub={`${unlocked.size} of ${(all ?? []).length} unlocked`} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(all ?? []).map((a) => {
            const got = unlocked.get(a.id);
            const Icon = ICONS[a.icon] ?? Trophy;
            return (
              <li key={a.id} className={`rounded-2xl border-2 p-3 ${got ? "border-yellow bg-yellow-soft" : "border-dashed border-line text-ink-3 [&_p]:!text-ink-3"}`}>
                <div className="flex items-center gap-2">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${got ? "bg-yellow text-[#3a2600]" : "bg-surface-2 text-ink-3"}`}>{got ? <Icon size={20} /> : <Lock size={18} />}</span>
                  {a.beta_only && <span className="beta-tag">BETA</span>}
                </div>
                <p className="mt-2 font-extrabold leading-tight">{a.title}</p>
                <p className="text-xs text-ink-2">{a.description}</p>
                {got && <p className="mt-1 text-[11px] text-ink-3">Unlocked {new Date(got).toLocaleDateString("en-AU", { dateStyle: "medium" })}</p>}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Exam countdowns" />
          {upcoming.length === 0 ? (
            <p className="text-ink-3">No upcoming exams.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold">{e.name}</span>
                  <span className={`pill num ${e.daysLeft <= 7 ? "pill-bad" : e.daysLeft <= 21 ? "pill-warn" : "pill-muted"}`}>{e.daysLeft} days</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Completed challenges" />
          {(challenges ?? []).length === 0 ? (
            <p className="text-ink-3">No finished challenges yet. Join a group to take part in weekly challenges.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(challenges ?? []).map((c) => (
                <li key={c.title + c.ends_on} className="flex items-center justify-between gap-2">
                  <span className="font-bold">{c.title}</span>
                  <span className={`pill ${c.winner_id === v.userId ? "pill-yellow" : "pill-muted"}`}>{c.winner_id === v.userId ? "Winner" : "Finished"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
