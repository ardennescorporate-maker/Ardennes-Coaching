"use server";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { aiErrorMessage } from "@/lib/ai";
import { ConfigSchema, generatePaper, saveAnswers, startPaper, startSample, submitPaper, type MarkOutcome } from "@/lib/server/papers";
import { allQuestions, type Paper, type PaperResult } from "@/lib/domain/paper";
import type { PaperConfig } from "@/lib/domain/paper";

export async function generatePaperAction(cfg: PaperConfig): Promise<{ error: string }> {
  const v = await getViewer();
  if (!v) redirect("/login");
  const parsed = ConfigSchema.safeParse(cfg);
  if (!parsed.success) return { error: "Check the paper settings and try again." };
  const c = parsed.data;
  if (c.counts.mcq + c.counts.short + c.counts.extended + c.counts.essay === 0) return { error: "Add at least one question." };
  let id: string;
  try {
    const paper = await generatePaper(v, c);
    id = await startPaper(v, c, paper);
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
  redirect(`/papers/${id}`);
}

export async function startSampleAction() {
  const v = await getViewer();
  if (!v) redirect("/login");
  const id = await startSample(v);
  redirect(`/papers/${id}`);
}

export async function saveAnswersAction(id: string, answers: Record<string, string>) {
  const v = await getViewer();
  if (!v) return false;
  return saveAnswers(v, id, answers);
}

export async function submitPaperAction(id: string, answers: Record<string, string>): Promise<{ ok: true; outcome: MarkOutcome } | { ok: false; error: string }> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Please log in again." };
  try {
    return { ok: true, outcome: await submitPaper(v, id, answers) };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

/** "Turn my mistakes into flashcards": one card per question that lost marks. */
export async function mistakesToFlashcardsAction(id: string): Promise<{ ok: boolean; deckId?: string; count?: number }> {
  const v = await getViewer();
  if (!v) return { ok: false };
  const db = adminClient();
  const { data: p } = await db.from("papers").select("paper, result, config").match({ id, user_id: v.userId, status: "marked" }).single();
  if (!p) return { ok: false };
  const paper = p.paper as Paper;
  const result = p.result as PaperResult;
  const missed = allQuestions(paper).filter((q) => {
    const m = result.questions.find((x) => x.id === q.id);
    return m && m.awarded < m.max;
  });
  if (!missed.length) return { ok: true, count: 0 };
  const strip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const { data: deck } = await db.from("decks").insert({ user_id: v.userId, name: strip(`Mistakes: ${paper.title}`, 80), subject: (p.config as PaperConfig).subject }).select("id").single();
  if (!deck) return { ok: false };
  await db.from("cards").insert(
    missed.map((q) => {
      const key = q.type === "mcq" && q.options && q.answer ? `${q.answer}: ${q.options["ABCD".indexOf(q.answer.toUpperCase())] ?? ""}` : q.sample;
      return { deck_id: deck.id, user_id: v.userId, q: strip(q.prompt, 500), a: strip(key, 500), box: 1, due: v.today };
    }),
  );
  return { ok: true, deckId: deck.id, count: missed.length };
}
