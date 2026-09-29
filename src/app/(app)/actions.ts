"use server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export async function saveThemePreference(theme: "system" | "light" | "dark") {
  if (!["system", "light", "dark"].includes(theme)) return;
  const v = await getViewer();
  if (!v) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ theme }).eq("id", v.userId);
}

export async function markAllNotificationsRead() {
  const v = await getViewer();
  if (!v) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", v.userId).is("read_at", null);
}

export async function markNotificationRead(id: string) {
  const v = await getViewer();
  if (!v) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", v.userId);
}
