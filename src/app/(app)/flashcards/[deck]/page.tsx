import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { DeckEditor } from "./DeckEditor";

export const metadata: Metadata = { title: "Edit deck" };

export default async function DeckPage({ params, searchParams }: PageProps<"/flashcards/[deck]">) {
  const v = await requireViewer();
  const { deck: id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id, name, subject").eq("id", id).maybeSingle();
  if (!deck) notFound();
  const { data: cards } = await supabase.from("cards").select("id, q, a, box, due").eq("deck_id", id).order("created_at");
  const due = (cards ?? []).filter((c) => c.due <= v.today).length;
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title={deck.name}
          sub={`${deck.subject} · ${cards?.length ?? 0} cards · ${due} due`}
          action={
            <div className="flex gap-2">
              <Link href={`/flashcards/${id}/review`} className="btn btn-primary btn-sm">
                Review
              </Link>
              {(cards?.length ?? 0) >= 4 && (
                <Link href={`/flashcards/${id}/quiz`} className="btn btn-secondary btn-sm">
                  Quiz
                </Link>
              )}
            </div>
          }
        />
        {sp.new === "1" && <p className="rounded-xl bg-good-soft px-3 py-2 text-sm font-bold text-good-ink">Pip made {cards?.length ?? 0} cards. Check them, then start reviewing!</p>}
      </Card>
      <DeckEditor deckId={id} cards={cards ?? []} />
    </div>
  );
}
