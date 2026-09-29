"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Markdown } from "@/components/markdown/Markdown";
import { useRewards } from "@/components/rewards/Rewards";
import { scoreQuizAction } from "../../actions";

type Q = { id: string; q: string; options: string[] };

export function Quiz({ deckId, deckName, questions }: { deckId: string; deckName: string; questions: Q[] }) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<{ cardId: string; answer: string }[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number; results: { cardId: string; correct: boolean; answer: string }[] } | null>(null);
  const [pending, start] = useTransition();
  const celebrate = useRewards();
  const q = questions[i];

  function pick(answer: string) {
    const next = [...picks, { cardId: q.id, answer }];
    setPicks(next);
    if (i + 1 < questions.length) setI(i + 1);
    else
      start(async () => {
        const r = await scoreQuizAction(deckId, next);
        setResult(r);
        celebrate(r.reward, `Quiz: ${r.correct}/${r.total}`);
      });
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/flashcards" className="icon-btn" aria-label="Close quiz">
          <X size={20} />
        </Link>
        <p className="min-w-0 flex-1 truncate font-extrabold">{deckName} · Quiz</p>
        {!result && <span className="num text-sm text-ink-3">{i + 1}/{questions.length}</span>}
      </div>
      {result ? (
        <div className="flex flex-col gap-4">
          <div className="card card-pad flex flex-col items-center gap-2 text-center">
            <Pip mood={result.correct / result.total >= 0.7 ? "cheer" : "talk"} size={130} />
            <h2 className="font-display text-3xl font-extrabold">
              {result.correct}/{result.total}
            </h2>
            <p className="text-ink-2">Cards you missed go back to box 1 so you see them again soon.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {questions.map((qq) => {
              const r = result.results.find((x) => x.cardId === qq.id);
              return (
                <li key={qq.id} className={`rounded-2xl border-2 p-3 ${r?.correct ? "border-good/50 bg-good-soft" : "border-bad/50 bg-bad-soft"}`}>
                  <Markdown className="font-bold">{qq.q}</Markdown>
                  {!r?.correct && r && <Markdown className="mt-1 text-sm">{`**Answer:** ${r.answer}`}</Markdown>}
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <Link href={`/flashcards/${deckId}/quiz`} className="btn btn-primary" onClick={() => location.reload()}>
              New quiz
            </Link>
            <Link href="/flashcards" className="btn btn-ghost">
              Back to decks
            </Link>
          </div>
        </div>
      ) : pending ? (
        <div className="card card-pad flex flex-col items-center gap-3 py-10">
          <Pip mood="think" size={110} animation="tilt" />
          <p className="font-bold">Checking your answers…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="card card-pad">
            <Markdown className="font-display text-xl font-bold">{q.q}</Markdown>
          </div>
          <div className="grid gap-2.5">
            {q.options.map((o, j) => (
              <button key={j} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-3.5 text-left font-bold shadow-[0_4px_0_var(--line)] hover:border-blue/50" onClick={() => pick(o)}>
                <span className="num grid h-9 w-9 flex-none place-items-center rounded-xl border-2 border-line">{"ABCD"[j]}</span>
                <Markdown className="min-w-0 flex-1">{o}</Markdown>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
