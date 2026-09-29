"use server";
import { getViewer } from "@/lib/viewer";
import { logEvidenceSession, type StudyResult } from "@/lib/server/study";

export async function logStudyAction(form: FormData): Promise<StudyResult> {
  const v = await getViewer();
  if (!v) return { ok: false, error: "Please log in again." };
  const file = form.get("evidence");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Add a photo, screenshot or file as evidence." };
  return logEvidenceSession(v, { subject: String(form.get("subject") ?? ""), minutes: Number(form.get("minutes")), file });
}
