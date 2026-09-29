"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { mistakesToFlashcardsAction } from "../actions";

export function MistakesButton({ id }: { id: string }) {
  const [deck, setDeck] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  if (deck)
    return (
      <Link href={`/flashcards?deck=${deck}`} className="btn btn-secondary btn-sm">
        Open flashcards
      </Link>
    );
  return (
    <button
      className="btn btn-gold btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await mistakesToFlashcardsAction(id);
          if (r.ok && r.deckId) {
            setDeck(r.deckId);
            toast(`Made ${r.count} flashcards from your mistakes`);
          } else toast("Couldn't make flashcards. Try again.");
        })
      }
    >
      {pending ? "Making cards…" : "Turn my mistakes into flashcards"}
    </button>
  );
}
