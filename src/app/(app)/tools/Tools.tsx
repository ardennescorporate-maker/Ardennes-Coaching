"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Pip } from "@/components/pip/Pip";
import { useRewards } from "@/components/rewards/Rewards";
import { useToast } from "@/components/ui/Toast";
import { evaluate, format, type AngleMode } from "@/lib/domain/calc";
import { completeFocusAction, deleteNoteAction, saveNoteAction, startFocusAction } from "./actions";

type Note = { id: string; title: string; subject: string; body: string; updated_at: string };

export function Tools({ subjects, notes, initialTab }: { subjects: string[]; notes: Note[]; initialTab: "focus" | "calc" | "notes" }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        label="Tool"
        options={[
          { value: "focus", label: "Focus timer" },
          { value: "calc", label: "Calculator" },
          { value: "notes", label: "Notes" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "focus" && <Focus subjects={subjects} />}
      {tab === "calc" && <Calculator />}
      {tab === "notes" && <Notes subjects={subjects} notes={notes} />}
    </div>
  );
}

// ─── Pomodoro ───────────────────────────────────────────────────────────────

function Focus({ subjects }: { subjects: string[] }) {
  const [length, setLength] = useState(25);
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const token = useRef<string | null>(null);
  const endAt = useRef<number | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const celebrate = useRewards();
  const toast = useToast();
  const [, start] = useTransition();

  const breakLen = length >= 45 ? 10 : 5;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        clearInterval(t);
        if (phase === "focus") {
          const tk = token.current;
          token.current = null;
          start(async () => {
            if (tk) {
              const r = await completeFocusAction(tk);
              if (r.ok) celebrate(r.reward, `Focus block done: ${r.minutes} min`);
              else toast(r.error);
            }
          });
          try {
            new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=").play().catch(() => {});
          } catch {}
          setPhase("break");
          setLeft(breakLen * 60);
        } else {
          setPhase("focus");
          setLeft(length * 60);
          toast("Break over. Ready for another block?");
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, phase, length, breakLen, celebrate, toast]);

  async function play() {
    if (phase === "focus" && !token.current) {
      token.current = await startFocusAction(length, subject);
      if (!token.current) return toast("Choose one of your subjects first.");
    }
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
    try {
      wake.current = await navigator.wakeLock?.request("screen");
    } catch {}
  }
  function pause() {
    setRunning(false);
    wake.current?.release().catch(() => {});
    // Pausing a focus block voids the server token: the full length must be timed.
    token.current = null;
    if (phase === "focus") toast("Paused. Restarting will begin a fresh block.");
    setLeft(phase === "focus" ? length * 60 : left);
  }
  function reset() {
    setRunning(false);
    token.current = null;
    setPhase("focus");
    setLeft(length * 60);
  }

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const total = (phase === "focus" ? length : breakLen) * 60;
  const pct = 1 - left / total;
  return (
    <Card>
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-4">
          <CardHeader title="Pomodoro focus timer" sub="Finish a full focus block to log it as verified study (+1 XP per minute)." />
          <div>
            <span className="label">Length</span>
            <ChipGroup
              label="Focus length"
              options={[15, 25, 45, 60].map((n) => ({ value: String(n), label: `${n} min` }))}
              value={String(length)}
              onChange={(v) => {
                if (running) return;
                setLength(Number(v));
                setPhase("focus");
                setLeft(Number(v) * 60);
              }}
            />
          </div>
          <label className="block max-w-xs">
            <span className="label">Subject</span>
            <select className="field" value={subject} disabled={running} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="relative grid h-56 w-56 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--surface-2)" strokeWidth="7" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={phase === "focus" ? "var(--blue)" : "var(--yellow)"} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${pct * 283} 283`} />
            </svg>
            <div className="text-center">
              <span className={`pill ${phase === "focus" ? "" : "pill-yellow"}`}>{phase === "focus" ? "Focus" : "Break"}</span>
              <p className="num mt-1 text-5xl font-bold" role="timer" aria-live="off">
                {mm}:{ss}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {running ? (
              <button className="btn btn-secondary" onClick={pause}>
                <Pause size={18} /> Pause
              </button>
            ) : (
              <button className="btn btn-gold" onClick={() => void play()}>
                <Play size={18} /> Start
              </button>
            )}
            <button className="btn btn-ghost" onClick={reset} aria-label="Reset timer">
              <RotateCcw size={18} /> Reset
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Calculator ─────────────────────────────────────────────────────────────

const KEYS = ["sin", "cos", "tan", "(", ")", "ln", "log", "√", "^", "÷", "7", "8", "9", "π", "×", "4", "5", "6", "e", "−", "1", "2", "3", "C", "+", "0", ".", "ANS", "⌫", "="];

function Calculator() {
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<AngleMode>("DEG");
  const [ans, setAns] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  const live = (() => {
    if (!expr.trim()) return "";
    try {
      return format(evaluate(expr, mode, ans));
    } catch {
      return "";
    }
  })();
  function press(k: string) {
    setShown(null);
    if (k === "C") return setExpr("");
    if (k === "⌫") return setExpr((e) => e.replace(/(sin|cos|tan|log|ln|ANS)\($|.$/, ""));
    if (k === "=") {
      try {
        const v = evaluate(expr, mode, ans);
        setAns(v);
        setShown(format(v));
        setExpr(format(v));
      } catch (e) {
        setShown((e as Error).message);
      }
      return;
    }
    if (["sin", "cos", "tan", "ln", "log"].includes(k)) return setExpr((e) => e + k + "(");
    if (k === "√") return setExpr((e) => e + "√(");
    setExpr((e) => e + k);
  }
  return (
    <Card className="mx-auto w-full max-w-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Scientific calculator</h2>
        <ChipGroup label="Angle mode" options={["DEG", "RAD"] as const} value={mode} onChange={setMode} />
      </div>
      <div className="rounded-2xl bg-surface-2 p-3 text-right">
        <input
          className="num w-full bg-transparent text-right text-xl outline-none"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && press("=")}
          aria-label="Expression"
          inputMode="decimal"
        />
        <p className="num min-h-8 text-2xl font-bold text-blue" aria-live="polite">
          {shown ?? (live ? `= ${live}` : "")}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => press(k === "−" ? "-" : k)}
            className={`btn !min-h-12 !px-0 !text-base normal-case ${k === "=" ? "btn-primary" : k === "C" ? "btn-danger" : /^[0-9.]$/.test(k) ? "btn-secondary" : "btn-ghost !bg-blue-soft"}`}
            style={{ textTransform: "none", letterSpacing: 0 }}
          >
            {k}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── Notes ──────────────────────────────────────────────────────────────────

function Notes({ subjects, notes }: { subjects: string[]; notes: Note[] }) {
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", subject: subjects[0] ?? "", body: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const edit = (n: Note | null) => {
    setEditing(n);
    setForm(n ? { title: n.title, subject: n.subject, body: n.body } : { title: "", subject: subjects[0] ?? "", body: "" });
  };
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader title={editing ? "Edit note" : "New note"} />
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await saveNoteAction(editing?.id ?? null, form);
              if (r.error) return setError(r.error);
              setError("");
              edit(null);
            });
          }}
        >
          <input className="field" placeholder="Title" aria-label="Note title" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="field" aria-label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <textarea className="field" rows={10} placeholder="Write your notes…" aria-label="Note body" maxLength={20000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          {error && <p className="text-sm font-bold text-bad">{error}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending}>
              Save note
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => edit(null)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
      <div className="flex flex-col gap-3">
        {notes.length === 0 && (
          <Card>
            <div className="flex items-center gap-3">
              <Pip mood="wave" size={70} />
              <p className="text-ink-2">Your notes live here, saved to the cloud. Turn any note into flashcards in one tap.</p>
            </div>
          </Card>
        )}
        {notes.map((n) => (
          <Card key={n.id}>
            <p className="micro text-ink-3">{n.subject}</p>
            <h3 className="font-display text-lg font-bold">{n.title}</h3>
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-ink-2">{n.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => edit(n)}>
                Edit
              </button>
              <Link href={`/flashcards?note=${n.id}`} className="btn btn-gold btn-sm">
                Make flashcards
              </Link>
              <button className="btn btn-danger btn-sm" onClick={() => confirm("Delete this note?") && start(() => deleteNoteAction(n.id))}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
