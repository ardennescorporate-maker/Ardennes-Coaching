"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { aiErrorMessage } from "@/lib/ai";
import { SUBJECTS } from "@/lib/domain/catalog";
import { XP } from "@/lib/domain/xp";
import type { Grade } from "@/lib/domain/srs";
import { awardXp, checkAchievements } from "@/lib/server/gamify";
import { finishReview, generateCards, gradeCard, scoreQuiz } from "@/lib/server/flashcards";

const MAX_FILE = 8 * 1024 * 1024;

async function viewer() {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}

export async function generateDeckAction(form: FormData): Promise<{ error: string } | undefined> {
  const v = await viewer();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const subject = String(form.get("subject") ?? "");
  const count = Math.max(5, Math.min(40, Number(form.get("count")) || 15));
  let text = String(form.get("notes") ?? "").slice(0, 30000);
  if (!name) return { error: "Give your deck a name." };
  if (!(SUBJECTS as readonly string[]).includes(subject)) return { error: "Choose a subject." };
  const images: { mime: string; data: string }[] = [];
  const pdfs: string[] = [];
  for (const f of form.getAll("files")) {
    if (!(f instanceof File) || !f.size) continue;
    if (f.size > MAX_FILE) return { error: `${f.name} is over 8 MB.` };
    const buf = Buffer.from(await f.arrayBuffer());
    if (f.type.startsWith("image/") && ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type)) images.push({ mime: f.type, data: buf.toString("base64") });
    else if (f.type === "application/pdf") pdfs.push(buf.toString("base64"));
    else if (/\.(txt|md|csv)$/i.test(f.name) || f.type.startsWith("text/")) text += `\n\n${buf.toString("utf8").slice(0, 30000)}`;
    else return { error: `${f.name}: use text, Markdown, CSV, PDF or image files.` };
  }
  if (images.length > 5 || pdfs.length > 3) return { error: "Use up to 5 photos and 3 PDFs at a time." };
  if (!text.trim() && !images.length && !pdfs.length) return { error: "Paste some notes or add a file for Pip to work from." };
  let cards: { q: string; a: string }[];
  try {
    cards = await generateCards(v, subject, count, { text: text.trim(), images, pdfs });
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }
  const supabase = await createClient();
  const { data: deck, error } = await supabase.from("decks").insert({ user_id: v.userId, name, subject }).select("id").single();
  if (error || !deck) return { error: "We couldn't save your deck." };
  await supabase.from("cards").insert(cards.map((c) => ({ ...c, deck_id: deck.id, user_id: v.userId, box: 1, due: v.today })));
  await awardXp(v.userId, XP.aiFlashcards, "ai_flashcards", { ref: `deck:${deck.id}`, study: false });
  redirect(`/flashcards/${deck.id}?new=1`);
}

export async function createEmptyDeckAction(form: FormData): Promise<{ error: string } | undefined> {
  const v = await viewer();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const subject = String(form.get("subject") ?? "");
  if (!name) return { error: "Give your deck a name." };
  if (!(SUBJECTS as readonly string[]).includes(subject)) return { error: "Choose a subject." };
  const supabase = await createClient();
  const { data } = await supabase.from("decks").insert({ user_id: v.userId, name, subject }).select("id").single();
  if (!data) return { error: "We couldn't create that deck." };
  redirect(`/flashcards/${data.id}`);
}

export async function addCardAction(deckId: string, q: string, a: string) {
  const v = await viewer();
  const qq = q.trim().slice(0, 500);
  const aa = a.trim().slice(0, 500);
  if (!qq || !aa) return { error: "Fill in both sides of the card." };
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("id").eq("id", deckId).maybeSingle();
  if (!deck) return { error: "Deck not found." };
  await supabase.from("cards").insert({ deck_id: deckId, user_id: v.userId, q: qq, a: aa, box: 1, due: v.today });
  const badges = await checkAchievements(v.userId);
  revalidatePath(`/flashcards/${deckId}`);
  return { ok: true, badges };
}

export async function deleteCardAction(cardId: string, deckId: string) {
  await viewer();
  const supabase = await createClient();
  await supabase.from("cards").delete().eq("id", cardId);
  revalidatePath(`/flashcards/${deckId}`);
}

export async function deleteDeckAction(deckId: string) {
  await viewer();
  const supabase = await createClient();
  await supabase.from("decks").delete().eq("id", deckId);
  redirect("/flashcards");
}

export async function gradeCardAction(cardId: string, g: Grade) {
  const v = await viewer();
  if (!["again", "hard", "good", "easy"].includes(g)) return false;
  return gradeCard(v, cardId, g);
}

export async function finishReviewAction(deckId: string, cardIds: string[]) {
  const v = await viewer();
  return finishReview(v, deckId, cardIds);
}

export async function scoreQuizAction(deckId: string, picks: { cardId: string; answer: string }[]) {
  const v = await viewer();
  return scoreQuiz(v, deckId, picks);
}
