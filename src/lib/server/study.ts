import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { structured, type AiUser } from "@/lib/ai";
import { SAFETY } from "@/lib/ai/prompts";
import { MAX_SESSION_MINUTES_PER_DAY, XP } from "@/lib/domain/xp";
import { awardXp, bumpCounters, notify, type Reward } from "./gamify";
import type { Viewer } from "@/lib/viewer";

export const EVIDENCE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export type StudyResult = { ok: true; reward: Reward; minutes: number } | { ok: false; error: string; review?: boolean };

const EvidenceVerdict = z.object({ study: z.boolean(), reason: z.string() });

/** Asks the fast model whether an image looks like genuine study work. */
async function checkImage(user: AiUser, bytes: Buffer, mime: string, subject: string) {
  return structured({
    user,
    kind: "evidence",
    tier: "fast",
    maxTokens: 400,
    schema: EvidenceVerdict,
    system: `${SAFETY}\nYou check evidence photos for a study-tracking app. Be fair: messy handwriting, screenshots of study apps, textbooks with notes, worked problems and typed notes all count. Reject selfies, memes, games, blank pages, unrelated photos and images of screens showing non-study content.`,
    content: [
      { type: "image", source: { type: "base64", media_type: mime as "image/png", data: bytes.toString("base64") } },
      { type: "text", text: `The student says this is evidence of studying ${subject}. Is this genuine study work (notes, worked problems, assignments, study app screenshots)? Reply JSON {"study": boolean, "reason": "one short sentence addressed to the student"}.` },
    ],
    mock: () => ({ study: true, reason: "Looks like study notes." }),
  });
}

/** Logs a study session backed by an evidence file. Enforces every anti-cheat rule server-side. */
export async function logEvidenceSession(v: Viewer, input: { subject: string; minutes: number; file: File }): Promise<StudyResult> {
  const db = adminClient();
  const minutes = Math.round(input.minutes);
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 240) return { ok: false, error: "Sessions must be between 10 and 240 minutes." };
  if (!v.profile.subjects.includes(input.subject)) return { ok: false, error: "Choose one of your subjects." };
  const ext = EVIDENCE_TYPES[input.file.type];
  if (!ext) return { ok: false, error: "Upload a photo, screenshot, PDF, Word document or text file." };
  if (input.file.size === 0 || input.file.size > MAX_EVIDENCE_BYTES) return { ok: false, error: "Evidence files must be under 10 MB." };

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");

  // Reused files are rejected (this user), and flagged if another student used them.
  const { data: reused } = await db.from("study_sessions").select("user_id").eq("file_hash", hash).limit(5);
  if (reused?.some((r) => r.user_id === v.userId)) return { ok: false, error: "You've already used this file as evidence. Upload new work for this session." };
  const copiedFromOthers = Boolean(reused?.length);

  // Daily cap.
  const { data: todays } = await db.from("study_sessions").select("minutes, created_at").eq("user_id", v.userId).eq("day", v.today);
  const loggedToday = (todays ?? []).reduce((a, s) => a + s.minutes, 0);
  const overCap = loggedToday + minutes > MAX_SESSION_MINUTES_PER_DAY;
  const burst = (todays ?? []).filter((s) => Date.parse(s.created_at) > Date.now() - 3600_000).length >= 3;

  // AI check for images.
  if (input.file.type.startsWith("image/")) {
    try {
      const verdict = await checkImage({ userId: v.userId, plan: v.profile.plan, isBeta: v.isBeta }, bytes, input.file.type, input.subject);
      if (!verdict.study) return { ok: false, error: `Pip couldn't verify that as study work: ${verdict.reason}` };
    } catch (e) {
      console.error("evidence check", e);
      return { ok: false, error: "Pip couldn't check that photo right now. Try again in a minute." };
    }
  }

  const path = `${v.userId}/${randomUUID()}.${ext}`;
  const up = await db.storage.from("evidence").upload(path, bytes, { contentType: input.file.type, upsert: false });
  if (up.error) {
    console.error("evidence upload", up.error.message);
    if (process.env.NODE_ENV === "production") return { ok: false, error: "We couldn't upload your evidence. Try again." };
  }

  const flagged = overCap || burst || copiedFromOthers;
  const flagReason = overCap ? "Over 6 hours logged today" : copiedFromOthers ? "Same file used by another student" : burst ? "Many sessions within an hour" : null;
  const { error } = await db.from("study_sessions").insert({
    user_id: v.userId,
    subject: input.subject,
    minutes,
    kind: "evidence",
    evidence_path: up.error ? null : path,
    file_hash: hash,
    verified: !flagged,
    flagged,
    flag_reason: flagReason,
    review_status: flagged ? "pending" : null,
    day: v.today,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already used this file as evidence." };
    return { ok: false, error: "We couldn't save that session. Try again." };
  }
  if (flagged) {
    return {
      ok: false,
      review: true,
      error: overCap ? "That takes you past 6 hours today, so the StudyPilot team will review it before XP is added." : "Thanks! This session needs a quick review by the StudyPilot team before XP is added.",
    };
  }
  return finishSession(v, input.subject, minutes, "study_session");
}

async function finishSession(v: Viewer, subject: string, minutes: number, reason: string): Promise<StudyResult> {
  await bumpCounters(v.userId, { minutes });
  const reward = await awardXp(v.userId, reason === "focus" ? XP.focusBlock(minutes) : XP.studySession(minutes), reason);
  if (reward.badges.some((b) => b.id === "first_session")) await notify(v.userId, "motivation", "First session logged!", "Every flight starts with take-off.", "/home");
  void subject;
  return { ok: true, reward, minutes };
}

// ─── Focus timer (Pomodoro) ─────────────────────────────────────────────────

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-secret";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Signed token proving when a focus block started; checked on completion. */
export function startFocusToken(userId: string, minutes: number, subject: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, m: minutes, s: subject, t: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function completeFocus(v: Viewer, token: string): Promise<StudyResult> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { ok: false, error: "That focus session couldn't be verified." };
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { ok: false, error: "That focus session couldn't be verified." };
  const { u, m, s, t } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; m: number; s: string; t: number };
  if (u !== v.userId || ![15, 25, 45, 60].includes(m)) return { ok: false, error: "That focus session couldn't be verified." };
  const elapsed = (Date.now() - t) / 60000;
  if (elapsed < m - 0.5) return { ok: false, error: "The timer hasn't finished yet." };
  if (elapsed > m + 240) return { ok: false, error: "That focus session expired." };

  const db = adminClient();
  const ref = sig.slice(0, 24);
  const { data: todays } = await db.from("study_sessions").select("minutes").eq("user_id", v.userId).eq("day", v.today);
  if ((todays ?? []).reduce((a, x) => a + x.minutes, 0) + m > MAX_SESSION_MINUTES_PER_DAY) return { ok: false, error: "You've logged 6 hours today. Take a well-earned break!" };
  const { error } = await db.from("study_sessions").insert({ user_id: v.userId, subject: s, minutes: m, kind: "focus", verified: true, day: v.today, file_hash: `focus:${ref}` });
  if (error) return { ok: false, error: error.code === "23505" ? "This focus block was already logged." : "We couldn't save that session." };
  return finishSession(v, s, m, "focus");
}
