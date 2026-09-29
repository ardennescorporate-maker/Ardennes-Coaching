import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Review } from "./Review";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({ params }: PageProps<"/flashcards/[deck]/review">) {
  const v = await requireViewer();
  const { deck: id } = await params;
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, name").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const { data: due } = await supabase.from("cards").select("id, q, a, box").eq("deck_id", id).lte("due", v.today).order("box").limit(50);
  let cards = due ?? [];
  let extra = false;
  if (!cards.length) {
    // Nothing due: offer a practice run of the lowest boxes.
    const { data } = await supabase.from("cards").select("id, q, a, box").eq("deck_id", id).order("box").limit(10);
    cards = data ?? [];
    extra = true;
  }
  return <Review deckId={id} deckName={deck.name} cards={cards} practice={extra} />;
}
