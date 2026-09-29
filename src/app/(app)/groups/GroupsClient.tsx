"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Copy, Flag, Flame, LogOut, Trophy } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Empty } from "@/components/ui/Empty";
import { ProgressBar } from "@/components/ui/XpBar";
import { Avatar } from "@/components/shell/Avatar";
import { useToast } from "@/components/ui/Toast";
import { browserClient } from "@/lib/supabase/browser";
import { ANNOUNCEMENT_MAX } from "@/lib/domain/moderation";
import type { Group, LeaderRow } from "@/lib/server/queries";
import { createGroupAction, joinGroupAction, leaveGroupAction, postAnnouncementAction, reportAnnouncementAction } from "./actions";

type Ann = { id: string; body: string; createdAt: string; author: string; colour: string; mine: boolean };
type Props = {
  groups: { id: string; name: string }[];
  group: Group | null;
  week: LeaderRow[];
  all: LeaderRow[];
  announcements: Ann[];
  challenge: { title: string; endsOn: string; leader: { name: string; papers: number; isYou: boolean } | null } | null;
  goalHours: number;
  weekHours: number;
  viewerId: string;
};

export function GroupsClient(p: Props) {
  const router = useRouter();
  const [period, setPeriod] = useState<"week" | "all">("week");
  const toast = useToast();
  const [, start] = useTransition();

  // Live updates: Supabase Realtime when available, plus a slow refresh as a fallback.
  useEffect(() => {
    if (!p.group) return;
    const supabase = browserClient();
    const ch = supabase
      .channel(`group-${p.group.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_announcements", filter: `group_id=eq.${p.group.id}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${p.group.id}` }, () => router.refresh())
      .subscribe();
    const t = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(t);
      void supabase.removeChannel(ch);
    };
  }, [p.group, router]);

  return (
    <div className="flex flex-col gap-5">
      {p.groups.length > 1 && (
        <div className="scroll-x flex gap-2" role="tablist" aria-label="Your groups">
          {p.groups.map((g) => (
            <Link key={g.id} role="tab" aria-selected={g.id === p.group?.id} href={`/groups?g=${g.id}`} className={`chip ${g.id === p.group?.id ? "is-selected" : ""}`}>
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {!p.group ? (
        <Card>
          <Empty title="Study better together" text="Join a group with a code from a friend or teacher, or start your own and compete on the weekly leaderboard." mood="wave" />
        </Card>
      ) : (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="micro text-ink-3">{p.group.type}</p>
                <h2 className="font-display text-2xl font-extrabold">{p.group.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-ink-3">Invite code</span>
                  <code className="num rounded-lg bg-surface-2 px-2 py-1 font-bold">{p.group.code}</code>
                  <button
                    className="icon-btn !h-9 !w-9"
                    aria-label="Copy invite code"
                    onClick={async () => {
                      await navigator.clipboard.writeText(p.group!.code).catch(() => {});
                      toast("Invite code copied");
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() =>
                  confirm(`Leave ${p.group!.name}?`) &&
                  start(async () => {
                    await leaveGroupAction(p.group!.id);
                    router.push("/groups");
                  })
                }
              >
                <LogOut size={15} /> Leave group
              </button>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                title="Leaderboard"
                action={
                  <ChipGroup
                    label="Leaderboard period"
                    options={[
                      { value: "week", label: "This week" },
                      { value: "all", label: "All time" },
                    ]}
                    value={period}
                    onChange={setPeriod}
                  />
                }
              />
              <ol className="flex flex-col gap-1.5">
                {(period === "week" ? p.week : p.all).map((r, i) => (
                  <li key={r.key} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.isYou ? "bg-blue-soft" : i % 2 ? "" : "bg-surface-2"}`}>
                    <span className={`num w-6 text-center font-bold ${i === 0 ? "text-yellow-deep" : "text-ink-3"}`}>{i === 0 ? <Trophy size={18} className="mx-auto" aria-label="1st" /> : i + 1}</span>
                    <Avatar name={r.username} colour={r.avatarColour} size={32} />
                    <span className="min-w-0 flex-1 truncate font-extrabold">
                      {r.username}
                      {r.isYou && <span className="font-bold text-blue"> (you)</span>}
                      {r.isBeta && !r.hidden && <span className="beta-tag ml-1.5">BETA</span>}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-ink-2" title="Streak">
                      <Flame size={14} className="text-yellow-deep" aria-hidden />
                      <span className="num">{r.streak}</span>
                    </span>
                    <span className="num w-20 text-right font-bold">{r.xp.toLocaleString()} XP</span>
                  </li>
                ))}
              </ol>
            </Card>
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader title="Shared goal" sub="Group study hours this week" />
                <ProgressBar value={p.weekHours} max={p.goalHours} label="Group hours this week" />
                <p className="num mt-2 font-bold">
                  {p.weekHours} / {p.goalHours} hours
                </p>
              </Card>
              {p.challenge && (
                <Card className="!border-yellow !bg-yellow-soft">
                  <p className="micro text-ink-3">Team challenge</p>
                  <h3 className="font-display text-lg font-bold">{p.challenge.title}</h3>
                  <p className="text-sm text-ink-2">Ends Sunday {p.challenge.endsOn.slice(5).split("-").reverse().join("/")} · Winner gets +200 XP</p>
                  <p className="mt-2 text-sm font-bold">
                    {p.challenge.leader ? (
                      <>
                        Leading: {p.challenge.leader.name}
                        {p.challenge.leader.isYou ? " (you)" : ""} with {p.challenge.leader.papers} {p.challenge.leader.papers === 1 ? "paper" : "papers"}
                      </>
                    ) : (
                      "No papers yet this week. Be the first!"
                    )}
                  </p>
                  <Link href="/papers" className="btn btn-gold btn-sm mt-3">
                    Do a paper
                  </Link>
                </Card>
              )}
            </div>
          </div>

          <Announcements groupId={p.group.id} items={p.announcements} />
        </>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <JoinCard />
        <CreateCard />
      </div>
    </div>
  );
}

function Announcements({ groupId, items }: { groupId: string; items: Ann[] }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Card>
      <CardHeader title="Announcements" />
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await postAnnouncementAction(groupId, body);
            if (r.error) return setError(r.error);
            setError("");
            setBody("");
          });
        }}
      >
        <textarea className="field !min-h-[80px]" maxLength={ANNOUNCEMENT_MAX} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a study tip or rally the group…" aria-label="New announcement" />
        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-sm" disabled={pending || !body.trim()}>
            Post
          </button>
          <span className="num text-xs text-ink-3">
            {body.length}/{ANNOUNCEMENT_MAX}
          </span>
          {error && <span className="text-sm font-bold text-bad">{error}</span>}
        </div>
      </form>
      <ul className="mt-4 flex flex-col gap-3">
        {items.length === 0 && <li className="text-ink-3">No announcements yet.</li>}
        {items.map((a) => (
          <li key={a.id} className="flex gap-3">
            <Avatar name={a.author} colour={a.colour} size={32} />
            <div className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2">
              <p className="text-sm">
                <span className="font-extrabold">{a.author}</span> <span className="text-xs text-ink-3">{new Date(a.createdAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
              <p className="whitespace-pre-wrap">{a.body}</p>
            </div>
            {!a.mine && (
              <button
                className="self-start rounded-lg p-1.5 text-ink-3 hover:text-bad"
                aria-label="Report this announcement"
                title="Report"
                onClick={() =>
                  start(async () => {
                    await reportAnnouncementAction(a.id);
                    toast("Thanks. We'll take a look.");
                  })
                }
              >
                <Flag size={15} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function JoinCard() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card>
      <CardHeader title="Join a group" sub="Enter the code from a friend or teacher." />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await joinGroupAction(code);
            if (r.error) return setError(r.error);
            setCode("");
            setError("");
            router.push(`/groups?g=${r.groupId}`);
          });
        }}
      >
        <input className="field num uppercase" placeholder="MATHS1-XXXX" aria-label="Group code" value={code} onChange={(e) => setCode(e.target.value)} required />
        <button className="btn btn-primary" disabled={pending}>
          Join
        </button>
      </form>
      {error && <p className="mt-2 text-sm font-bold text-bad">{error}</p>}
    </Card>
  );
}

function CreateCard() {
  const [form, setForm] = useState({ name: "", type: "Friend group", goal: 20 });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card>
      <CardHeader title="Create a group" />
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createGroupAction(form);
            if (r.error) return setError(r.error);
            router.push(`/groups?g=${r.groupId}`);
          });
        }}
      >
        <label className="block sm:col-span-2">
          <span className="label">Name</span>
          <input className="field" maxLength={40} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["Friend group", "Private study group", "Class group", "Competition team"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Weekly goal (hours)</span>
          <input className="field num" type="number" min={1} max={500} value={form.goal} onChange={(e) => setForm({ ...form, goal: Number(e.target.value) || 20 })} />
        </label>
        {error && <p className="text-sm font-bold text-bad sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <button className="btn btn-primary" disabled={pending}>
            Create group
          </button>
        </div>
      </form>
    </Card>
  );
}
