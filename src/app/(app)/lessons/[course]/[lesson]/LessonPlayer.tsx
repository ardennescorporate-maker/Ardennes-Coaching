"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Star, X } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Markdown } from "@/components/markdown/Markdown";
import { useRewards } from "@/components/rewards/Rewards";
import { answerIndex, type LessonContent } from "@/lib/domain/lesson";
import { completeLessonAction, loadLessonAction, saveLessonStateAction } from "../../actions";
import type { LessonResult } from "@/lib/server/lessons";

type Props = { courseSlug: string; lessonSlug: string; subject: string; unitTitle: string; title: string; next: { slug: string; title: string } | null };
type Phase = "loading" | "error" | "intro" | "step" | "question" | "complete";
const PRAISE = ["Nice one!", "Spot on!", "You got it!", "Brilliant!"];
const LETTERS = ["A", "B", "C", "D"];

export function LessonPlayer(p: Props) {
  const router = useRouter();
  const celebrate = useRewards();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [lesson, setLesson] = useState<{ id: string; content: LessonContent } | null>(null);
  const [step, setStep] = useState(0);
  const [q, setQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null, null]);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<(LessonResult & { courseDone: number; courseTotal: number }) | null>(null);
  const [saving, startSave] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSeq = useRef(0);
  const load = useCallback(
    async (fresh: boolean) => {
      // Only the latest load may update state (effects can run twice, and users can regenerate).
      const seq = ++loadSeq.current;
      setPhase("loading");
      const r = await loadLessonAction(p.courseSlug, p.lessonSlug, fresh);
      if (seq !== loadSeq.current) return;
      if (!r.ok) {
        setError(r.error);
        setPhase("error");
        return;
      }
      setLesson({ id: r.id, content: r.content });
      setResult(null);
      setChecked(false);
      const s = r.state;
      if (s?.answers?.some((a) => a !== null)) {
        const firstOpen = s.answers.findIndex((a) => a === null);
        setAnswers(s.answers.concat([null, null, null, null]).slice(0, 4));
        setQ(firstOpen < 0 ? 3 : firstOpen);
        setPhase("question");
      } else if (s?.step) {
        setAnswers([null, null, null, null]);
        setStep(Math.min(s.step, r.content.steps.length - 1));
        setPhase("step");
      } else {
        setAnswers([null, null, null, null]);
        setStep(0);
        setQ(0);
        setPhase("intro");
      }
    },
    [p.courseSlug, p.lessonSlug],
  );

  useEffect(() => {
    // Initial load of lesson content (network), not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
    return () => {
      // Invalidate any in-flight load for this mount (a counter, not a DOM ref).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      loadSeq.current++;
    };
  }, [load]);

  // Autosave position (debounced).
  const persist = useCallback(
    (nextStep: number, nextAnswers: (number | null)[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void saveLessonStateAction(p.courseSlug, p.lessonSlug, { step: nextStep, answers: nextAnswers }), 600);
    },
    [p.courseSlug, p.lessonSlug],
  );

  const c = lesson?.content;
  const totalUnits = c ? c.steps.length + c.questions.length : 1;
  const doneUnits = phase === "intro" || phase === "loading" ? 0 : phase === "step" ? step : phase === "question" ? (c?.steps.length ?? 0) + q + (checked ? 1 : 0) : totalUnits;
  const pct = Math.round((doneUnits / totalUnits) * 100);

  const askPip = (text: string) => router.push(`/tutor?subject=${encodeURIComponent(p.subject)}&q=${encodeURIComponent(text)}`);

  function finish() {
    if (!lesson) return;
    startSave(async () => {
      const r = await completeLessonAction(p.courseSlug, p.lessonSlug, lesson.id, answers);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult({ ...r.result, courseDone: r.courseDone, courseTotal: r.courseTotal });
      setPhase("complete");
      celebrate(r.result.reward, r.result.firstTime ? "Lesson complete!" : "Lesson replayed!");
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg" role="dialog" aria-label={`Lesson: ${p.title}`}>
      <div className="mx-auto flex min-h-full max-w-[760px] flex-col px-4 pb-10 pt-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/lessons?course=${p.courseSlug}`} className="icon-btn" aria-label="Close lesson">
            <X size={20} />
          </Link>
          <div className="progress h-3 flex-1" role="progressbar" aria-label="Lesson progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="num w-11 text-right text-sm font-bold text-ink-2">{pct}%</span>
        </div>

        <div className="flex flex-1 flex-col pt-6">
          {phase === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" aria-live="polite">
              <Pip mood="think" size={150} animation="tilt" />
              <p className="font-display text-xl font-bold">Pip is writing your lesson on {p.title}…</p>
              <p className="text-sm text-ink-3">This can take up to a minute the first time.</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <Pip mood="think" size={130} animation="none" />
              <p role="alert" className="max-w-md font-bold text-ink-2">
                {error}
              </p>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={() => void load(false)}>
                  Try again
                </button>
                <Link href={`/lessons?course=${p.courseSlug}`} className="btn btn-ghost">
                  Back to course
                </Link>
              </div>
            </div>
          )}

          {phase === "intro" && c && (
            <div className="flex flex-col items-center gap-5 text-center">
              <Pip mood="wave" size={170} />
              <p className="bubble bubble-bottom max-w-lg text-left">{c.hook}</p>
              <div>
                <p className="micro text-ink-3">
                  {p.subject} · {p.unitTitle}
                </p>
                <h1 className="font-display mt-1 text-3xl font-extrabold">{p.title}</h1>
              </div>
              <div className="card card-pad w-full text-left">
                <p className="font-extrabold">By the end you&apos;ll be able to:</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {c.goals.map((g) => (
                    <li key={g} className="flex gap-2">
                      <Check className="mt-1 flex-none text-good-ink" size={18} aria-hidden />
                      <Markdown className="flex-1">{g}</Markdown>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-3">
                  {c.steps.length} short steps with Pip, then {c.questions.length} check questions
                </p>
              </div>
              <button
                className="btn btn-primary btn-lg w-full sm:w-auto"
                autoFocus
                onClick={() => {
                  setStep(0);
                  setPhase("step");
                  persist(0, answers);
                }}
              >
                Let&apos;s go
              </button>
            </div>
          )}

          {phase === "step" && c && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <Pip mood="talk" size={80} />
                <div className="bubble bubble-left mt-2">
                  <p className="micro text-ink-3">
                    Step {step + 1} of {c.steps.length}
                  </p>
                  <h2 className="font-display text-xl font-bold">{c.steps[step].title}</h2>
                </div>
              </div>
              <article className="card card-pad text-[17px]">
                <Markdown>{c.steps[step].body}</Markdown>
                {c.steps[step].example && (
                  <div className="mt-4 rounded-2xl border-2 border-blue/30 bg-blue-soft p-4">
                    <p className="micro text-blue-ink">Worked example</p>
                    <Markdown className="mt-1">{c.steps[step].example!}</Markdown>
                  </div>
                )}
              </article>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <button className="btn btn-ghost" onClick={() => askPip(`Can you explain "${c.steps[step].title}" from the lesson "${p.title}" another way?`)}>
                  Ask Pip about this
                </button>
                <span className="flex-1" />
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    if (step === 0) setPhase("intro");
                    else {
                      setStep(step - 1);
                      persist(step - 1, answers);
                    }
                  }}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  autoFocus
                  onClick={() => {
                    if (step + 1 < c.steps.length) {
                      setStep(step + 1);
                      persist(step + 1, answers);
                    } else {
                      setQ(0);
                      setChecked(false);
                      setPhase("question");
                    }
                  }}
                >
                  {step + 1 < c.steps.length ? "Continue" : "Check my understanding"}
                </button>
              </div>
            </div>
          )}

          {phase === "question" && c && (
            <Question
              key={q}
              index={q}
              total={c.questions.length}
              question={c.questions[q]}
              selected={answers[q]}
              checked={checked}
              onSelect={(i) => {
                if (checked) return;
                const next = [...answers];
                next[q] = i;
                setAnswers(next);
              }}
              onCheck={() => {
                setChecked(true);
                persist(c.steps.length, answers);
              }}
              onContinue={() => {
                if (q + 1 < c.questions.length) {
                  setQ(q + 1);
                  setChecked(false);
                } else finish();
              }}
              busy={saving}
              error={error}
            />
          )}

          {phase === "complete" && c && result && (
            <div className="flex flex-col items-center gap-4 text-center">
              <Pip mood="cheer" size={170} />
              <h1 className="font-display text-4xl font-extrabold">Lesson complete!</h1>
              <div className="flex gap-1 text-yellow-deep" aria-label={`${result.stars} of 3 stars`}>
                {[1, 2, 3].map((s) => (
                  <Star key={s} size={44} fill={s <= result.stars ? "var(--yellow)" : "none"} strokeWidth={2} aria-hidden />
                ))}
              </div>
              <div className="grid w-full grid-cols-3 gap-3">
                <Stat label="Score" value={`${result.correct}/${result.total}`} />
                <Stat label="XP earned" value={`+${result.reward.awarded}`} gold />
                <Stat label="Course" value={`${result.courseDone}/${result.courseTotal}`} />
              </div>
              <div className="card card-pad w-full text-left">
                <p className="font-extrabold">Pip&apos;s key takeaways</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {c.summary.map((s) => (
                    <li key={s} className="flex gap-2">
                      <Star size={16} className="mt-1 flex-none text-yellow-deep" fill="currentColor" aria-hidden />
                      <Markdown className="flex-1">{s}</Markdown>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {result.correct < result.total && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const missed = c.questions.filter((_, i) => !result.results[i]).map((x) => `- ${x.q}`).join("\n");
                      askPip(`I just did the lesson "${p.title}" and got these questions wrong:\n${missed}\nCan you help me understand my mistakes?`);
                    }}
                  >
                    Review my mistakes with Pip
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => void load(true)}>
                  Get a new version
                </button>
                <Link href={`/lessons?course=${p.courseSlug}`} className="btn btn-ghost">
                  Back to course
                </Link>
                {p.next && (
                  <Link href={`/lessons/${p.courseSlug}/${p.next.slug}`} className="btn btn-primary">
                    Next lesson
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className={`card card-pad !p-3 ${gold ? "!border-yellow !bg-yellow-soft" : ""}`}>
      <p className="micro text-ink-3">{label}</p>
      <p className="num text-2xl font-bold">{value}</p>
    </div>
  );
}

function Question(props: {
  index: number;
  total: number;
  question: LessonContent["questions"][number];
  selected: number | null;
  checked: boolean;
  onSelect: (i: number) => void;
  onCheck: () => void;
  onContinue: () => void;
  busy: boolean;
  error: string;
}) {
  const { question: qq, selected, checked } = props;
  const correctIdx = answerIndex(qq.answer, qq.options);
  const right = checked && selected === correctIdx;
  const [praise] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-start gap-3">
        <Pip mood={checked ? (right ? "cheer" : "talk") : "think"} size={80} animation={checked ? "bob" : "tilt"} />
        <div className="bubble bubble-left mt-2 min-w-0 flex-1">
          <p className="micro text-ink-3">
            Question {props.index + 1} of {props.total}
          </p>
          <Markdown className="font-display text-lg font-bold">{qq.q}</Markdown>
        </div>
      </div>
      <div role="radiogroup" aria-label="Answer options" className="grid gap-2.5">
        {qq.options.map((o, i) => {
          const isSel = selected === i;
          const state = checked ? (i === correctIdx ? "right" : isSel ? "wrong" : "idle") : isSel ? "sel" : "idle";
          return (
            <button
              key={i}
              role="radio"
              aria-checked={isSel}
              disabled={checked}
              onClick={() => props.onSelect(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left font-bold transition ${
                state === "right"
                  ? "border-good bg-good-soft"
                  : state === "wrong"
                    ? "border-bad bg-bad-soft"
                    : state === "sel"
                      ? "border-blue bg-blue-soft shadow-[0_4px_0_var(--blue)]"
                      : "border-line bg-surface shadow-[0_4px_0_var(--line)] hover:border-blue/50"
              }`}
            >
              <span className={`num grid h-9 w-9 flex-none place-items-center rounded-xl border-2 ${state === "sel" ? "border-blue bg-blue-fill text-white" : "border-line"}`}>{LETTERS[i]}</span>
              <Markdown className="min-w-0 flex-1">{o}</Markdown>
            </button>
          );
        })}
      </div>
      {checked && (
        <div role="status" className={`rounded-2xl p-4 ${right ? "bg-good-soft" : "bg-bad-soft"}`}>
          <p className={`font-display text-lg font-extrabold ${right ? "text-good-ink" : "text-bad-ink"}`}>{right ? praise : "Not quite. Here's why:"}</p>
          <Markdown className="mt-1">{qq.explain}</Markdown>
          {!right && (
            <p className="mt-2 text-sm font-bold">
              Correct answer: {LETTERS[correctIdx]}
            </p>
          )}
        </div>
      )}
      {props.error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-bold text-bad-ink">
          {props.error}
        </p>
      )}
      <div className="mt-auto flex justify-end pt-2">
        {!checked ? (
          <button className="btn btn-primary btn-lg" disabled={selected === null} onClick={props.onCheck}>
            Check
          </button>
        ) : (
          <button className={`btn btn-lg ${right ? "btn-primary" : "btn-danger-solid"}`} autoFocus disabled={props.busy} onClick={props.onContinue}>
            {props.busy ? "Saving…" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
