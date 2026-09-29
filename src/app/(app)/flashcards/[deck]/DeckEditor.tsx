"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Markdown } from "@/components/markdown/Markdown";
import { useRewards } from "@/components/rewards/Rewards";
import { addCardAction, deleteCardAction, deleteDeckAction } from "../actions";

export function DeckEditor({ deckId, cards }: { deckId: string; cards: { id: string; q: string; a: string; box: number; due: string }[] }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const celebrate = useRewards();
  return (
    <>
      <Card>
        <CardHeader title="Add a card" />
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addCardAction(deckId, q, a);
              if ("error" in r && r.error) return setError(r.error);
              setError("");
              setQ("");
              setA("");
              if ("badges" in r && r.badges?.length) celebrate({ awarded: 0, xp: 0, level: 0, leveledUp: false, badges: r.badges });
            });
          }}
        >
          <label className="block">
            <span className="label">Front (question)</span>
            <textarea className="field" rows={3} maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Back (answer)</span>
            <textarea className="field" rows={3} maxLength={500} value={a} onChange={(e) => setA(e.target.value)} required />
          </label>
          {error && <p role="alert" className="text-sm font-bold text-bad sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button className="btn btn-primary" disabled={pending}>
              Add card
            </button>
          </div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Cards" />
        {cards.length === 0 ? (
          <p className="text-ink-3">No cards yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {cards.map((c) => (
              <li key={c.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                <Markdown className="font-bold">{c.q}</Markdown>
                <Markdown className="text-ink-2">{c.a}</Markdown>
                <div className="flex items-center gap-2">
                  <span className="pill pill-muted num">Box {c.box}</span>
                  <button className="icon-btn !h-9 !w-9 hover:!text-bad" aria-label="Delete card" onClick={() => start(() => deleteCardAction(c.id, deckId))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div>
        <button className="btn btn-danger" onClick={() => confirm("Delete this deck and all its cards?") && start(() => deleteDeckAction(deckId))}>
          Delete deck
        </button>
      </div>
    </>
  );
}
