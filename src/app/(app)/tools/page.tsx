import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Tools } from "./Tools";

export const metadata: Metadata = { title: "Study Tools" };

export default async function ToolsPage({ searchParams }: PageProps<"/tools">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: notes } = await supabase.from("notes").select("id, title, subject, body, updated_at").order("updated_at", { ascending: false });
  const tab = sp.focus === "1" || sp.tab === "focus" ? "focus" : sp.tab === "notes" ? "notes" : sp.tab === "calc" ? "calc" : "focus";
  return <Tools subjects={v.profile.subjects} notes={notes ?? []} initialTab={tab} />;
}
