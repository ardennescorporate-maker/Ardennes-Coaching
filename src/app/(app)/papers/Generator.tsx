"use client";
import { useState, useTransition } from "react";
import { Pip } from "@/components/pip/Pip";
import { Card, CardHeader } from "@/components/ui/Card";
import { EXAM_SYSTEMS, SUBJECTS } from "@/lib/domain/catalog";
import { DIFFICULTIES, type PaperConfig } from "@/lib/domain/paper";
import { generatePaperAction, startSampleAction } from "./actions";

const YEARS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];

export function Generator({ subjects, system, year }: { subjects: string[]; system: string; year: string }) {
  const [cfg, setCfg] = useState<PaperConfig>({
    exam: (EXAM_SYSTEMS as readonly string[]).includes(system) ? system : "NSW HSC",
    subject: subjects[0] ?? SUBJECTS[0],
    year: YEARS.includes(year) ? year : "Year 12",
    difficulty: "Exam standard",
    topics: "",
    timeMinutes: 60,
    counts: { mcq: 5, short: 3, extended: 1, essay: 0 },
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [samplePending, startSample] = useTransition();
  const total = cfg.counts.mcq + cfg.counts.short + cfg.counts.extended + cfg.counts.essay;
  const set = <K extends keyof PaperConfig>(k: K, val: PaperConfig[K]) => setCfg((c) => ({ ...c, [k]: val }));
  const count = (k: keyof PaperConfig["counts"], val: number) => setCfg((c) => ({ ...c, counts: { ...c.counts, [k]: val } }));

  if (pending)
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-10 text-center" aria-live="polite">
          <Pip mood="think" size={150} animation="tilt" />
          <p className="font-display text-xl font-bold">Pip is writing your {cfg.exam} {cfg.subject} paper…</p>
          <p className="text-sm text-ink-3">Real exam formatting, syllabus content and a marking guideline. This takes about a minute.</p>
        </div>
      </Card>
    );

  return (
    <Card>
      <CardHeader
        title="Generate a practice paper"
        sub="Pip writes a paper in the style of your exam, then marks it against real criteria."
        action={
          <form action={() => startSample(() => startSampleAction())}>
            <button className="btn btn-secondary btn-sm" disabled={samplePending}>
              {samplePending ? "Opening…" : "Try the sample HSC Maths paper"}
            </button>
          </form>
        }
      />
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!total) return setError("Add at least one question.");
          start(async () => {
            const r = await generatePaperAction(cfg);
            if (r?.error) setError(r.error);
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Exam</span>
            <select className="field" value={cfg.exam} onChange={(e) => set("exam", e.target.value)}>
              {EXAM_SYSTEMS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Subject</span>
            <select className="field" value={cfg.subject} onChange={(e) => set("subject", e.target.value)}>
              {[...subjects, ...SUBJECTS.filter((s) => !subjects.includes(s))].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Year level</span>
            <select className="field" value={cfg.year} onChange={(e) => set("year", e.target.value)}>
              {YEARS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Difficulty</span>
            <select className="field" value={cfg.difficulty} onChange={(e) => set("difficulty", e.target.value as PaperConfig["difficulty"])}>
              {DIFFICULTIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="label">
              Topics <span className="font-semibold text-ink-3">(optional)</span>
            </span>
            <input className="field" maxLength={300} value={cfg.topics} onChange={(e) => set("topics", e.target.value)} placeholder="e.g. Calculus, logarithms" />
          </label>
          <label className="block">
            <span className="label">Time limit (minutes)</span>
            <input type="number" className="field num" min={10} max={180} value={cfg.timeMinutes} onChange={(e) => set("timeMinutes", Math.max(10, Math.min(180, Number(e.target.value) || 10)))} />
          </label>
        </div>
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <legend className="label">Questions</legend>
          {(
            [
              ["mcq", "Multiple choice", 10],
              ["short", "Short answer", 6],
              ["extended", "Extended response", 3],
              ["essay", "Essays", 1],
            ] as const
          ).map(([k, label, max]) => (
            <label key={k} className="rounded-xl bg-surface-2 p-3">
              <span className="block text-sm font-extrabold">{label}</span>
              <span className="mt-1 flex items-center gap-2">
                <input type="range" min={0} max={max} value={cfg.counts[k]} onChange={(e) => count(k, Number(e.target.value))} className="flex-1 accent-[var(--blue)]" aria-label={`${label} count`} />
                <span className="num w-6 text-right font-bold">{cfg.counts[k]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button className="btn btn-primary btn-lg" disabled={!total}>
            Generate paper
          </button>
          <span className="text-sm text-ink-3">{total} questions</span>
        </div>
      </form>
    </Card>
  );
}
