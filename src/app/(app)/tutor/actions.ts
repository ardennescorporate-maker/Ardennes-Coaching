"use server";
import { adminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";

/** ▲ Helpful / ▼ Wrong or unclear: stores the rating and files an "AI accuracy" report. */
export async function rateReplyAction(messageId: string, rating: 1 | -1) {
  const v = await getViewer();
  if (!v || (rating !== 1 && rating !== -1)) return { ok: false };
  const db = adminClient();
  const { data: msg } = await db.from("tutor_messages").select("id, content, chat_id, rating").match({ id: messageId, user_id: v.userId, role: "assistant" }).maybeSingle();
  if (!msg) return { ok: false };
  await db.from("tutor_messages").update({ rating }).eq("id", messageId);
  if (msg.rating === null) {
    await db.from("feedback").insert({
      user_id: v.userId,
      category: "AI accuracy",
      rating: rating === 1 ? 5 : 1,
      body: rating === 1 ? "Pip's answer was helpful." : "Pip's answer was wrong or unclear.",
      context: { messageId, chatId: msg.chat_id, excerpt: msg.content.slice(0, 500) },
      priority: rating === 1 ? "Low" : "Medium",
    });
  }
  return { ok: true };
}

export async function deleteChatAction(chatId: string) {
  const v = await getViewer();
  if (!v) return;
  await adminClient().from("tutor_chats").delete().match({ id: chatId, user_id: v.userId });
}
