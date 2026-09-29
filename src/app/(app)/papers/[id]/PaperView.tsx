"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Clock } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Markdown } from "@/components/markdown/Markdown";
import { useRewards } from "@/components/rewards/Rewards";
import { totalMarks, type Paper, type PaperConfig } from "@/lib/domain/paper";
import { saveAnswersAction, submitPaperAction } from "../actions";

const LETTERS = ["A", "B", "C", "D"];

export function PaperView({ id, paper, cfg, initialAnswers, deadline, marking }: { id: string; paper: Paper; cfg: PaperConfig; initialAnswers: Record<string, string>; deadline: string | null; marking: boolean }) {
  const router = useRouter();
  const celebrate = useRewards();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [left, setLeft] = useState<number | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const answersRef = useRef(answers);
  const submitted = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    setError("");
    start(async () => {
      const r = await submitPaperAction(id, answersRef.current);
      if (!r.ok) {
        submitted.current = false;
        setError(r.error);
        return;
      }
      celebrate(r.outcome.reward, "Paper marked!");
      router.refresh();
    });
  }, [id, celebrate, router]);

  // Countdown; auto-submit at zero.
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const s = Math.max(0, Math.round((Date.parse(deadline) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) submit();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  function update(qid: string, val: string) {
    const next = { ...answersRef.current, [qid]: val };
    answersRef.current = next;
    setAnswers(next);
    setSaved("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveAnswersAction(id, answersRef.current);
      setSaved("saved");
    }, 800);
  }

  if (pending || marking)
    return (
      <div className="card card-pad flex flex-col items-center gap-4 py-14 text-center" aria-live="polite">
        <Pip mood="think" size={150} animation="tilt" />
        <p className="font-display text-xl font-bold">Pip is marking your paper…</p>
        <p className="text-sm text-ink-3">Checking every answer against the marking guideline.</p>
        {marking && !pending && (
          <button className="btn btn-secondary" onClick={() => router.refresh()}>
            Check again
          </button>
        )}
      </div>
    );

  const mm = left === null ? "--" : String(Math.floor(left / 60)).padStart(2, "0");
  const ss = left === null ? "--" : String(left % 60).padStart(2, "0");
  const urgent = left !== null && left < 300;
  const answered = Object.values(answers).filter((a) => a.trim()).length;
  const count = paper.sections.reduce((a, s) => a + s.questions.length, 0);
  let num = 0;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4">
      <div className="card sticky top-[76px] z-20 flex items-center gap-3 !py-2.5 px-4 max-[900px]:top-[122px]">
        <span className={`num flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xl font-bold ${urgent ? "bg-bad-soft text-bad-ink" : "bg-surface-2"}`} role="timer" aria-label={`Time left ${mm} minutes ${ss} seconds`}>
          <Clock size={18} aria-hidden /> {mm}:{ss}
        </span>
        <span className="text-sm text-ink-3">
          {answered}/{count} answered · {saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : "Autosaves"}
        </span>
        <span className="flex-1" />
        <button className="btn btn-primary" onClick={() => confirm("Submit your paper for marking?") && submit()}>
          Submit
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad-ink">
          {error}
        </p>
      )}

      <article className="card overflow-hidden !p-0 font-[Georgia,serif] text-[16px]" aria-label="Exam paper">
        <header className="border-b-2 border-line bg-surface-2 p-5 text-center sm:p-7">
          <p className="micro font-sans text-ink-3">
            {cfg.exam} · {cfg.subject}
          </p>
          <h1 className="font-display mt-1 text-2xl font-extrabold">{paper.title}</h1>
          <p className="mt-1 font-sans text-sm font-bold text-ink-2">
            Total marks: {totalMarks(paper)} · Working time: {paper.timeMinutes} minutes
          </p>
        </header>
        <section className="border-b-2 border-line p-5 sm:px-7">
          <h2 className="font-sans font-extrabold">General instructions</h2>
          <ul className="mt-1 list-disc pl-5 text-ink-2">
            {paper.instructions.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
        {paper.sections.map((s) => (
          <section key={s.name} className="border-b-2 border-line p-5 last:border-0 sm:px-7">
            <h2 className="font-display text-lg font-bold">{s.name}</h2>
            <ol className="mt-3 flex flex-col gap-6">
              {s.questions.map((q) => {
                num++;
                return (
                  <li key={q.id} className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <span className="num flex-none font-bold">{num}.</span>
                      <Markdown className="min-w-0 flex-1">{q.prompt}</Markdown>
                      <span className="num flex-none whitespace-nowrap rounded-lg bg-surface-2 px-2 py-0.5 font-sans text-xs font-bold">
                        {q.marks} {q.marks === 1 ? "mark" : "marks"}
                      </span>
                    </div>
                    {q.stimulus && (
                      <div className="ml-7 rounded-xl border-2 border-line bg-surface-2 p-3">
                        <Markdown>{q.stimulus}</Markdown>
                      </div>
                    )}
                    {q.type === "mcq" && q.options ? (
                      <div role="radiogroup" aria-label={`Question ${num} options`} className="ml-7 grid gap-2 font-sans">
                        {q.options.map((o, i) => (
                          <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 ${answers[q.id] === LETTERS[i] ? "border-blue bg-blue-soft" : "border-line hover:border-blue/40"}`}>
                            <input type="radio" name={`q-${q.id}`} className="sr-only" checked={answers[q.id] === LETTERS[i]} onChange={() => update(q.id, LETTERS[i])} />
                            <span className={`num grid h-8 w-8 flex-none place-items-center rounded-full border-2 font-bold ${answers[q.id] === LETTERS[i] ? "border-blue bg-blue-fill text-white" : "border-line"}`}>{LETTERS[i]}</span>
                            <Markdown className="min-w-0 flex-1">{o}</Markdown>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className="field ml-7 w-[calc(100%-1.75rem)] font-sans"
                        rows={q.type === "essay" ? 16 : q.type === "extended" ? 10 : 5}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => update(q.id, e.target.value)}
                        aria-label={`Answer to question ${num}`}
                        placeholder="Write your answer. Show your working."
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        <footer className="flex justify-center p-6">
          <button className="btn btn-primary btn-lg" onClick={() => confirm("Submit your paper for marking?") && submit()}>
            Submit for marking
          </button>
        </footer>
      </article>
    </div>
  );
}
