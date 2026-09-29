import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Quiz } from "./Quiz";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({ params }: PageProps<"/flashcards/[deck]/quiz">) {
  await requireViewer();
  const { deck: id } = await params;
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, name").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const { data: cards } = await supabase.from("cards").select("id, q, a").eq("deck_id", id);
  const all = cards ?? [];
  if (all.length < 4) notFound();
  // Up to 10 random cards, each with 3 distractors from other cards' answers.
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const questions = shuffle(all)
    .slice(0, 10)
    .map((c) => {
      const others = shuffle([...new Set(all.filter((o) => o.id !== c.id && o.a !== c.a).map((o) => o.a))]).slice(0, 3);
      return { id: c.id, q: c.q, options: shuffle([c.a, ...others]) };
    });
  return <Quiz deckId={id} deckName={deck.name} questions={questions} />;
}
