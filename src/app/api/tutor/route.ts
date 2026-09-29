import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { aiErrorMessage, streamText } from "@/lib/ai";
import { tutorSystem } from "@/lib/ai/prompts";
import { SUBJECTS } from "@/lib/domain/catalog";
import { XP } from "@/lib/domain/xp";
import { TUTOR_LEVELS, TUTOR_MODES } from "@/lib/domain/tutor";
import { awardXp, type Reward } from "@/lib/server/gamify";
import type Anthropic from "@anthropic-ai/sdk";


const Body = z.object({
  chatId: z.string().uuid().nullable().optional(),
  subject: z.enum(SUBJECTS),
  mode: z.enum(TUTOR_MODES),
  level: z.enum(TUTOR_LEVELS),
  message: z.string().trim().min(1).max(6000),
});

export async function POST(req: NextRequest) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type a question for Pip first." }, { status: 400 });
  const { subject, mode, level, message } = parsed.data;
  const db = adminClient();

  // Chat (own only).
  let chatId = parsed.data.chatId ?? null;
  if (chatId) {
    const { data } = await db.from("tutor_chats").select("id").match({ id: chatId, user_id: v.userId }).maybeSingle();
    if (!data) chatId = null;
  }
  if (!chatId) {
    const { data, error } = await db.from("tutor_chats").insert({ user_id: v.userId, subject, title: message.slice(0, 60) }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Couldn't start a chat." }, { status: 500 });
    chatId = data.id as string;
  }

  // Last 12 turns of history.
  const { data: hist } = await db.from("tutor_messages").select("role, content").eq("chat_id", chatId).order("created_at", { ascending: false }).limit(12);
  const history: Anthropic.Beta.BetaMessageParam[] = (hist ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  while (history.length && history[0].role !== "user") history.shift();

  await db.from("tutor_messages").insert({ chat_id: chatId, user_id: v.userId, role: "user", content: message });
  const assistantId = randomUUID();

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await streamText({
      user: { userId: v.userId, plan: v.profile.plan, isBeta: v.isBeta },
      system: tutorSystem({ year: v.profile.year_level ?? "Year 12", system: v.profile.system ?? "NSW HSC", country: v.profile.country ?? "Australia", subject, language: v.profile.language }, mode, level),
      messages: [...history, { role: "user", content: message }],
      signal: req.signal,
      onDone: async (full) => {
        if (full.trim()) await db.from("tutor_messages").insert({ id: assistantId, chat_id: chatId, user_id: v.userId, role: "assistant", content: full });
        await db.from("tutor_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
      },
    });
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 429 });
  }

  // First question of the day: +10 XP (deduped by date).
  let reward: Reward | null = null;
  try {
    reward = await awardXp(v.userId, XP.firstTutorQuestion, "tutor", { ref: `tutor:${v.today}` });
  } catch (e) {
    console.error("tutor xp", e);
  }

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-chat-id": chatId,
      "x-message-id": assistantId,
      "x-reward": reward && reward.awarded > 0 ? encodeURIComponent(JSON.stringify(reward)) : "",
    },
  });
}
