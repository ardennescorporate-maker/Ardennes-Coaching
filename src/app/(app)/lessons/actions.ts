"use server";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { SUBJECTS } from "@/lib/domain/catalog";
import { aiErrorMessage } from "@/lib/ai";
import { completeLesson, getLessonContent, lessonContext, type LessonResult } from "@/lib/server/lessons";
import type { LessonContent } from "@/lib/domain/lesson";

export async function addCourseAction(subject: string) {
  const v = await getViewer();
  if (!v || !(SUBJECTS as readonly string[]).includes(subject) || v.profile.subjects.includes(subject)) return;
  await adminClient().from("profiles").update({ subjects: [...v.profile.subjects, subject] }).eq("id", v.userId);
  revalidatePath("/lessons");
}

export type LoadedLesson = { ok: true; id: string; content: LessonContent; state: { step?: number; answers?: (number | null)[] } | null } | { ok: false; error: string };

export async function loadLessonAction(courseSlug: string, lessonSlug: string, fresh = false): Promise<LoadedLesson> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Please log in again." };
  const ctx = await lessonContext(courseSlug, lessonSlug);
  if (!ctx) return { ok: false, error: "We couldn't find that lesson." };
  if (!ctx.unlocked) return { ok: false, error: "Finish the lessons before this one to unlock it." };
  try {
    const c = await getLessonContent(v, ctx, fresh);
    const { data: prog } = await adminClient().from("lesson_progress").select("state").match({ user_id: v.userId, lesson_id: ctx.lesson.id }).maybeSingle();
    return { ok: true, id: c.id, content: c.content, state: fresh ? null : (prog?.state ?? null) };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

/** Autosaves the student's position so they can resume. */
export async function saveLessonStateAction(courseSlug: string, lessonSlug: string, state: { step: number; answers: (number | null)[] }) {
  const v = await getViewer();
  if (!v) return;
  const ctx = await lessonContext(courseSlug, lessonSlug);
  if (!ctx?.unlocked) return;
  const safe = { step: Math.max(0, Math.min(20, Math.round(state.step))), answers: state.answers.slice(0, 4).map((a) => (a === null ? null : Math.max(0, Math.min(3, Math.round(a))))) };
  await adminClient().from("lesson_progress").upsert({ user_id: v.userId, lesson_id: ctx.lesson.id, course_id: ctx.course.id, state: safe, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
}

export async function completeLessonAction(courseSlug: string, lessonSlug: string, contentId: string, answers: (number | null)[]): Promise<{ ok: true; result: LessonResult; courseDone: number; courseTotal: number } | { ok: false; error: string }> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Please log in again." };
  const ctx = await lessonContext(courseSlug, lessonSlug);
  if (!ctx?.unlocked) return { ok: false, error: "This lesson is locked." };
  try {
    const result = await completeLesson(v, ctx, contentId, answers);
    revalidatePath("/lessons");
    return { ok: true, result, courseDone: ctx.course.done + (result.firstTime ? 1 : 0), courseTotal: ctx.course.total };
  } catch (e) {
    console.error("complete lesson", e);
    return { ok: false, error: "We couldn't save your result. Check your connection and try again." };
  }
}
