"use client";
import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toast";
import { FEEDBACK_CATEGORIES, FEEDBACK_PRIORITIES, FEEDBACK_STATUSES } from "@/lib/domain/feedback";
import {
  announceAction,
  createCodeAction,
  evidenceUrlAction,
  moderateAnnouncementAction,
  removeBetaAccessAction,
  restoreBetaAccessAction,
  reviewSessionAction,
  setCodeActiveAction,
  updateFeedbackAction,
} from "./actions";

type Props = {
  sentryUrl: string | null;
  stats: { betaUsers: number; totalAccounts: number; dau: number; retention: number | null; aiRequests: number; papersGenerated: number; papersMarked: number; studyHours: number; avgRating: number | null };
  codes: { id: string; code: string; max_uses: number; uses: number; active: boolean; created_at: string; joined: string[] }[];
  users: { id: string; username: string; email: string; code: string; joined: string; level: number; hours: number; ai: number; removed: boolean; isAdmin: boolean }[];
  features: { feature: string; count: number }[];
  feedback: { id: string; user: string; category: string; rating: number | null; body: string; priority: string; status: string; created_at: string }[];
  flagged: { id: string; user: string; subject: string; minutes: number; flag_reason: string | null; evidence_path: string | null; created_at: string }[];
  hidden: { id: string; body: string; reports: number }[];
  selfId: string;
};

const date = (s: string) => new Date(s).toLocaleDateString("en-AU", { dateStyle: "medium" });

export function AdminClient(p: Props) {
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Beta users" value={p.stats.betaUsers} sub={`${p.stats.totalAccounts} accounts`} />
        <Stat label="Daily active" value={p.stats.dau} sub="studied today" />
        <Stat label="7-day retention" value={p.stats.retention === null ? "—" : `${p.stats.retention}%`} sub="joined 7+ days ago, active this week" />
        <Stat label="AI requests" value={p.stats.aiRequests} sub="all time" />
        <Stat label="Papers" value={p.stats.papersGenerated} sub={`${p.stats.papersMarked} marked`} />
        <Stat label="Study hours" value={p.stats.studyHours} sub="verified, all users" />
        <Stat label="Avg feedback rating" value={p.stats.avgRating ?? "—"} sub="out of 5" />
        <div className="card card-pad flex flex-col justify-center gap-2">
          <p className="micro text-ink-3">Errors and crashes</p>
          {p.sentryUrl ? (
            <a href={p.sentryUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              Open Sentry <ExternalLink size={14} />
            </a>
          ) : (
            <p className="text-sm text-ink-3">Set SENTRY_DASHBOARD_URL to link it here.</p>
          )}
        </div>
      </div>

      <Codes codes={p.codes} />

      <Card>
        <CardHeader title="Beta users" sub={`${p.users.length} joined through invite codes`} />
        <div className="scroll-x">
          <table className="table min-w-[860px]">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Code</th>
                <th>Joined</th>
                <th>Level</th>
                <th>Study h</th>
                <th>AI</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.users.map((u) => (
                <tr key={u.id} className={u.removed ? "opacity-55" : ""}>
                  <td className="font-extrabold">
                    {u.username} {u.isAdmin && <span className="pill">admin</span>}
                  </td>
                  <td className="text-ink-2">{u.email}</td>
                  <td className="num">{u.code}</td>
                  <td className="whitespace-nowrap">{date(u.joined)}</td>
                  <td className="num">{u.level}</td>
                  <td className="num">{u.hours}</td>
                  <td className="num">{u.ai}</td>
                  <td>
                    {u.id === p.selfId ? null : u.removed ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => start(() => restoreBetaAccessAction(u.id))}>
                        Restore
                      </button>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => confirm(`Remove beta access for ${u.username}?`) && start(() => removeBetaAccessAction(u.id))}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Most used features" sub="Screen visits, last 30 days" />
          {p.features.length === 0 ? (
            <p className="text-ink-3">No visits yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {p.features.map((f) => (
                <li key={f.feature} className="grid grid-cols-[100px_1fr_48px] items-center gap-3 text-sm">
                  <span className="font-bold capitalize">{f.feature}</span>
                  <span className="h-3 rounded-full bg-blue" style={{ width: `${(f.count / p.features[0].count) * 100}%` }} />
                  <span className="num text-right">{f.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Announce onSent={(n) => toast(`Sent to ${n} beta users`)} />
      </div>

      <FeedbackTable rows={p.feedback} />

      <Card>
        <CardHeader title="Study sessions needing review" sub="Flagged by the anti-cheat rules" />
        {p.flagged.length === 0 ? (
          <p className="text-ink-3">Nothing to review.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {p.flagged.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="font-extrabold">{s.user}</span> · {s.subject} · <span className="num">{s.minutes} min</span>
                  <span className="block text-sm text-warn">{s.flag_reason}</span>
                </span>
                {s.evidence_path && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      const url = await evidenceUrlAction(s.evidence_path!);
                      if (url) window.open(url, "_blank", "noopener");
                      else toast("Evidence file not found.");
                    }}
                  >
                    View evidence
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => start(() => reviewSessionAction(s.id, true))}>
                  Approve
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => start(() => reviewSessionAction(s.id, false))}>
                  Reject
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Hidden group posts" sub="Hidden automatically after 3 reports" />
        {p.hidden.length === 0 ? (
          <p className="text-ink-3">No hidden posts.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {p.hidden.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  {h.body} <span className="pill pill-bad">{h.reports} reports</span>
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => start(() => moderateAnnouncementAction(h.id, true))}>
                  Restore
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => start(() => moderateAnnouncementAction(h.id, false))}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="card card-pad">
      <p className="micro text-ink-3">{label}</p>
      <p className="num mt-1 text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-ink-3">{sub}</p>
    </div>
  );
}

function Codes({ codes }: { codes: Props["codes"] }) {
  const [form, setForm] = useState({ prefix: "PILOT", limit: 25, custom: "" });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Invite codes" />
      <form
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await createCodeAction(form);
            setMsg(r.error ?? `Created ${r.code}`);
            if (!r.error) setForm({ ...form, custom: "" });
          });
        }}
      >
        <label className="block">
          <span className="label">Prefix</span>
          <input className="field num uppercase" maxLength={10} value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Or exact code (optional)</span>
          <input className="field num uppercase" maxLength={32} value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} placeholder="HSC-EARLY-7QX4" />
        </label>
        <label className="block">
          <span className="label">Usage limit</span>
          <input className="field num" type="number" min={1} max={500} value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })} />
        </label>
        <button className="btn btn-primary" disabled={pending}>
          Generate code
        </button>
      </form>
      {msg && <p className="mb-3 text-sm font-bold">{msg}</p>}
      <div className="scroll-x">
        <table className="table min-w-[640px]">
          <thead>
            <tr>
              <th>Code</th>
              <th>Uses</th>
              <th>Joined</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const status = !c.active ? "Disabled" : c.uses >= c.max_uses ? "Used up" : "Active";
              return (
                <tr key={c.id}>
                  <td className="num font-bold">{c.code}</td>
                  <td className="num">
                    {c.uses}/{c.max_uses}
                  </td>
                  <td className="max-w-[260px] truncate text-sm text-ink-2" title={c.joined.join(", ")}>
                    {c.joined.join(", ") || "—"}
                  </td>
                  <td>
                    <span className={`pill ${status === "Active" ? "pill-good" : status === "Used up" ? "pill-yellow" : "pill-muted"}`}>{status}</span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => start(() => setCodeActiveAction(c.id, !c.active))}>
                      {c.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Announce({ onSent }: { onSent: (n: number) => void }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Announce to beta users" sub="Sends an in-app notification to every beta user." />
      <textarea className="field" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Announcement" placeholder="New: practice papers now support essays…" />
      <button
        className="btn btn-primary mt-3"
        disabled={pending || !body.trim()}
        onClick={() =>
          start(async () => {
            const r = await announceAction(body);
            if ("sent" in r) {
              onSent(r.sent ?? 0);
              setBody("");
            }
          })
        }
      >
        Send announcement
      </button>
    </Card>
  );
}

function FeedbackTable({ rows }: { rows: Props["feedback"] }) {
  const [cat, setCat] = useState<string>("All");
  const [, start] = useTransition();
  const shown = cat === "All" ? rows : rows.filter((r) => r.category === cat);
  return (
    <Card>
      <CardHeader title="Feedback and bug reports" sub={`${rows.filter((r) => r.status === "New").length} new`} />
      <ChipGroup label="Filter by category" options={["All", ...FEEDBACK_CATEGORIES]} value={cat} onChange={setCat} className="mb-3" />
      <div className="scroll-x">
        <table className="table min-w-[900px]">
          <thead>
            <tr>
              <th>Report</th>
              <th>User</th>
              <th>Rating</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="max-w-[420px]">
                  <span className="pill pill-muted mb-1">{r.category}</span>
                  <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                  <p className="text-xs text-ink-3">{date(r.created_at)}</p>
                </td>
                <td>{r.user}</td>
                <td className="num">{r.rating ?? "—"}</td>
                <td>
                  <select className="field !min-h-9 !py-1" aria-label="Priority" defaultValue={r.priority} onChange={(e) => start(() => updateFeedbackAction(r.id, { priority: e.target.value }))}>
                    {FEEDBACK_PRIORITIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select className="field !min-h-9 !py-1" aria-label="Status" defaultValue={r.status} onChange={(e) => start(() => updateFeedbackAction(r.id, { status: e.target.value }))}>
                    {FEEDBACK_STATUSES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
