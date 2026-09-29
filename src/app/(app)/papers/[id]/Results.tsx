import Link from "next/link";
import { Pip } from "@/components/pip/Pip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Markdown } from "@/components/markdown/Markdown";
import { ProgressBar } from "@/components/ui/XpBar";
import { allQuestions, paperReaction, type Paper, type PaperConfig, type PaperResult } from "@/lib/domain/paper";
import { MistakesButton } from "./MistakesButton";

export function Results({ id, paper, cfg, result, answers }: { id: string; paper: Paper; cfg: PaperConfig; result: PaperResult; answers: Record<string, string> }) {
  const react = paperReaction(result.pct);
  const qs = allQuestions(paper);
  const hasMistakes = result.questions.some((q) => q.awarded < q.max);
  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-5">
      <section className="hero-navy flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <Pip mood={react.mood} size={140} />
        <div className="min-w-0 flex-1">
          <p className="micro text-white/70">
            {cfg.exam} · {cfg.subject}
          </p>
          <h1 className="font-display text-2xl font-extrabold">{paper.title}</h1>
          <p className="mt-1 text-white/85">{react.line}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Big label="Score" value={`${result.score}/${result.max}`} />
            <Big label="Percentage" value={`${result.pct}%`} />
            <Big label="Predicted" value={result.band} gold />
          </div>
        </div>
      </section>

      {result.essay && (
        <Card>
          <CardHeader title="Essay analysis" />
          <div className="grid gap-3">
            {(Object.entries(result.essay) as [string, number][]).map(([k, val]) => (
              <div key={k} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                <span className="font-bold capitalize">{k}</span>
                <ProgressBar value={val} max={5} label={`${k} ${val} of 5`} />
                <span className="num text-right text-sm font-bold">{val}/5</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Strengths" />
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {result.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="How to improve" />
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {result.improvements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {result.weakTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.weakTopics.map((t) => (
                <Link key={t} href={`/tutor?subject=${encodeURIComponent(cfg.subject)}&q=${encodeURIComponent(`Can you help me with ${t}?`)}`} className="pill pill-warn">
                  {t}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Marked paper" action={hasMistakes ? <MistakesButton id={id} /> : null} />
        <ol className="flex flex-col gap-4">
          {qs.map((q, i) => {
            const m = result.questions.find((x) => x.id === q.id);
            const t = m ? (m.awarded === m.max ? "good" : m.awarded === 0 ? "bad" : "warn") : "warn";
            return (
              <li key={q.id} className={`rounded-2xl border-2 p-4 ${t === "good" ? "border-good/40" : t === "bad" ? "border-bad/40" : "border-warn/40"}`}>
                <div className="flex items-start gap-3">
                  <span className="num font-bold">{i + 1}.</span>
                  <Markdown className="min-w-0 flex-1">{q.prompt}</Markdown>
                  <span className={`pill num whitespace-nowrap ${t === "good" ? "pill-good" : t === "bad" ? "pill-bad" : "pill-warn"}`}>
                    {m?.awarded ?? 0}/{q.marks}
                  </span>
                </div>
                <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="micro text-ink-3">Your answer</p>
                  <p className="mt-1 whitespace-pre-wrap">{answers[q.id]?.trim() || <em className="text-ink-3">No answer</em>}</p>
                </div>
                {m?.feedback && (
                  <div className={`mt-2 rounded-xl p-3 text-sm ${t === "good" ? "bg-good-soft" : t === "bad" ? "bg-bad-soft" : "bg-warn-soft"}`}>
                    <p className="micro text-ink-3">Pip&apos;s feedback</p>
                    <Markdown className="mt-1">{m.feedback}</Markdown>
                  </div>
                )}
                <details className="mt-2 rounded-xl border-2 border-line p-3 text-sm">
                  <summary className="cursor-pointer font-extrabold">Marking guideline and model answer</summary>
                  <Markdown className="mt-2 whitespace-pre-wrap">{q.criteria}</Markdown>
                  <p className="micro mt-3 text-ink-3">Model answer</p>
                  <Markdown className="mt-1">{q.sample}</Markdown>
                </details>
              </li>
            );
          })}
        </ol>
      </Card>

      {result.exemplar && (
        <Card>
          <CardHeader title="Example high-scoring answer" />
          <Markdown>{result.exemplar}</Markdown>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/papers" className="btn btn-primary">
          Generate another paper
        </Link>
        <Link href={`/tutor?subject=${encodeURIComponent(cfg.subject)}&q=${encodeURIComponent(`I scored ${result.pct}% on a ${cfg.subject} practice paper. My weak topics were: ${result.weakTopics.join(", ") || "none"}. What should I revise first?`)}`} className="btn btn-secondary">
          Ask Pip what to revise
        </Link>
      </div>
    </div>
  );
}

function Big({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`rounded-2xl px-4 py-2.5 ${gold ? "bg-yellow text-[#3a2600]" : "bg-white/12"}`} style={gold ? undefined : { background: "rgba(255,255,255,.12)" }}>
      <p className={`micro ${gold ? "" : "text-white/70"}`}>{label}</p>
      <p className="num text-2xl font-bold">{value}</p>
    </div>
  );
}
