"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Pip } from "@/components/pip/Pip";
import { Markdown } from "@/components/markdown/Markdown";
import { useRewards } from "@/components/rewards/Rewards";
import type { Grade } from "@/lib/domain/srs";
import { finishReviewAction, gradeCardAction } from "../../actions";

type C = { id: string; q: string; a: string; box: number };
const GRADES: { g: Grade; label: string; cls: string; key: string }[] = [
  { g: "again", label: "Again", cls: "btn-danger", key: "1" },
  { g: "hard", label: "Hard", cls: "btn-secondary", key: "2" },
  { g: "good", label: "Good", cls: "btn-primary", key: "3" },
  { g: "easy", label: "Easy", cls: "btn-gold", key: "4" },
];

export function Review({ deckId, deckName, cards, practice }: { deckId: string; deckName: string; cards: C[]; practice: boolean }) {
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [done, setDone] = useState(cards.length === 0);
  const [, start] = useTransition();
  const celebrate = useRewards();
  const card = queue[0];

  function answer(g: Grade) {
    if (!card) return;
    void gradeCardAction(card.id, g);
    const ids = reviewed.includes(card.id) ? reviewed : [...reviewed, card.id];
    setReviewed(ids);
    setFlipped(false);
    // "Again" puts the card back at the end of this session.
    const rest = g === "again" ? [...queue.slice(1), card] : queue.slice(1);
    setQueue(rest);
    if (!rest.length) {
      setDone(true);
      start(async () => celebrate(await finishReviewAction(deckId, ids), `Reviewed ${ids.length} cards`));
    }
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (done || !card) return;
      if ((e.key === "Enter" || e.key === " ") && !flipped) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) answer(g.g);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/flashcards" className="icon-btn" aria-label="Close review">
          <X size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{deckName}</p>
          <p className="text-sm text-ink-3">{practice ? "Nothing due, so here's a practice run." : `${queue.length} left`}</p>
        </div>
      </div>
      {done ? (
        <div className="card card-pad flex flex-col items-center gap-3 text-center">
          <Pip mood="cheer" size={140} />
          <h2 className="font-display text-2xl font-extrabold">{reviewed.length ? "Deck reviewed!" : "No cards to review"}</h2>
          <p className="text-ink-2">{reviewed.length ? `You reviewed ${reviewed.length} cards. Pip scheduled each one for the right time.` : "Add some cards first."}</p>
          <Link href="/flashcards" className="btn btn-primary">
            Back to decks
          </Link>
        </div>
      ) : (
        card && (
          <>
            <button
              type="button"
              className="flip h-[320px] w-full [perspective:1200px]"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? "Card answer. Tap to see the question." : "Card question. Tap or press Enter to flip."}
            >
              <span className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
                <span className="card absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 [backface-visibility:hidden]">
                  <span className="micro text-ink-3">Question · Box {card.box}</span>
                  <Markdown className="text-center text-xl font-bold">{card.q}</Markdown>
                  <span className="text-sm text-ink-3">Tap to flip</span>
                </span>
                <span className="card absolute inset-0 flex flex-col items-center justify-center gap-3 !border-blue p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <span className="micro text-blue">Answer</span>
                  <Markdown className="text-center text-xl font-bold">{card.a}</Markdown>
                </span>
              </span>
            </button>
            {flipped ? (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button key={g.g} className={`btn ${g.cls}`} onClick={() => answer(g.g)}>
                    {g.label}
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setFlipped(true)}>
                Show answer
              </button>
            )}
          </>
        )
      )}
    </div>
  );
}
