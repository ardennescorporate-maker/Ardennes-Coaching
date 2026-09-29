import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Empty } from "@/components/ui/Empty";
import { CreateDeck } from "./CreateDeck";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage({ searchParams }: PageProps<"/flashcards">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: decks }, { data: cards }] = await Promise.all([
    supabase.from("decks").select("id, name, subject, created_at").order("created_at", { ascending: false }),
    supabase.from("cards").select("deck_id, box, due"),
  ]);
  let prefill = "";
  let prefillSubject = "";
  if (typeof sp.note === "string") {
    const { data: note } = await supabase.from("notes").select("title, subject, body").eq("id", sp.note).maybeSingle();
    if (note) {
      prefill = `${note.title}\n\n${note.body}`;
      prefillSubject = note.subject;
    }
  }
  const stats = new Map<string, { total: number; due: number; boxes: number[] }>();
  for (const c of cards ?? []) {
    const s = stats.get(c.deck_id) ?? { total: 0, due: 0, boxes: [0, 0, 0, 0, 0] };
    s.total++;
    if (c.due <= v.today) s.due++;
    s.boxes[c.box - 1]++;
    stats.set(c.deck_id, s);
  }
  return (
    <div className="flex flex-col gap-5">
      <CreateDeck subjects={v.profile.subjects} prefill={prefill} prefillSubject={prefillSubject} />
      {!decks?.length ? (
        <Card>
          <Empty title="No decks yet" text="Paste your notes or snap a photo, and Pip will turn them into flashcards." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => {
            const s = stats.get(d.id) ?? { total: 0, due: 0, boxes: [0, 0, 0, 0, 0] };
            const max = Math.max(1, ...s.boxes);
            return (
              <Card key={d.id} className={sp.deck === d.id ? "!border-blue" : ""}>
                <p className="micro text-ink-3">{d.subject}</p>
                <h3 className="font-display mt-1 text-lg font-bold leading-tight">{d.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`pill ${s.due ? "pill-yellow" : "pill-good"}`}>{s.due ? `${s.due} due` : "Up to date"}</span>
                  <span className="pill pill-muted">{s.total} cards</span>
                </div>
                <div className="mt-3 flex h-14 items-end gap-1.5" role="img" aria-label={`Leitner boxes: ${s.boxes.map((b, i) => `box ${i + 1}: ${b}`).join(", ")}`}>
                  {s.boxes.map((b, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                      <span className="num text-[10px] text-ink-3">{b}</span>
                      <div className="w-full rounded-t-md bg-blue" style={{ height: `${Math.max(3, (b / max) * 34)}px`, opacity: 0.35 + i * 0.16 }} />
                      <span className="text-[10px] font-bold text-ink-3">{i + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/flashcards/${d.id}/review`} className={`btn btn-primary btn-sm ${s.total ? "" : "pointer-events-none opacity-55"}`} aria-disabled={!s.total}>
                    Review
                  </Link>
                  <Link href={`/flashcards/${d.id}/quiz`} className={`btn btn-secondary btn-sm ${s.total >= 4 ? "" : "pointer-events-none opacity-55"}`} aria-disabled={s.total < 4} title={s.total < 4 ? "Quizzes need at least 4 cards" : undefined}>
                    Quiz
                  </Link>
                  <Link href={`/flashcards/${d.id}`} className="btn btn-ghost btn-sm">
                    Edit
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
