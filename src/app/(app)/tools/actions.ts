"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { SUBJECTS } from "@/lib/domain/catalog";
import { completeFocus, startFocusToken, type StudyResult } from "@/lib/server/study";

export async function startFocusAction(minutes: number, subject: string): Promise<string | null> {
  const v = await getViewer();
  if (!v || ![15, 25, 45, 60].includes(minutes) || !v.profile.subjects.includes(subject)) return null;
  return startFocusToken(v.userId, minutes, subject);
}

export async function completeFocusAction(token: string): Promise<StudyResult> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Please log in again." };
  return completeFocus(v, token);
}

const Note = z.object({ title: z.string().trim().min(1).max(120), subject: z.enum(SUBJECTS), body: z.string().max(20000) });

export async function saveNoteAction(id: string | null, input: { title: string; subject: string; body: string }) {
  const v = await getViewer();
  if (!v) return { error: "Please log in again." };
  const p = Note.safeParse(input);
  if (!p.success) return { error: "Give your note a title." };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("notes").update(p.data).eq("id", id) : await supabase.from("notes").insert({ ...p.data, user_id: v.userId });
  revalidatePath("/tools");
  return error ? { error: "Couldn't save your note." } : { ok: true };
}

export async function deleteNoteAction(id: string) {
  const v = await getViewer();
  if (!v) return;
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", id);
  revalidatePath("/tools");
}
