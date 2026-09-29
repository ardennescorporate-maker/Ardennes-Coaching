import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Tutor } from "./Tutor";

export const metadata: Metadata = { title: "Ask Pip" };

export default async function TutorPage({ searchParams }: PageProps<"/tutor">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: chats } = await supabase.from("tutor_chats").select("id, title, subject, updated_at").order("updated_at", { ascending: false }).limit(20);
  const chatId = typeof sp.chat === "string" ? sp.chat : null;
  const { data: messages } = chatId ? await supabase.from("tutor_messages").select("id, role, content, rating").eq("chat_id", chatId).order("created_at") : { data: [] };
  const chat = chatId ? chats?.find((c) => c.id === chatId) : null;
  const subjectParam = typeof sp.subject === "string" ? sp.subject : null;
  const subject = chat?.subject ?? (subjectParam && v.profile.subjects.includes(subjectParam) ? subjectParam : v.profile.subjects[0]);
  return (
    <Tutor
      key={chatId ?? "new"}
      username={v.profile.username ?? "there"}
      subjects={v.profile.subjects}
      initialSubject={subject}
      chatId={chat ? chat.id : null}
      initialMessages={(messages ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content, rating: m.rating }))}
      chats={(chats ?? []).map((c) => ({ id: c.id, title: c.title, subject: c.subject }))}
      prefill={typeof sp.q === "string" ? sp.q.slice(0, 4000) : ""}
    />
  );
}
