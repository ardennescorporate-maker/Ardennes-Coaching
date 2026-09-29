import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import type { Paper, PaperConfig, PaperResult } from "@/lib/domain/paper";
import { PaperView } from "./PaperView";
import { Results } from "./Results";

export const metadata: Metadata = { title: "Practice paper" };

export default async function PaperPage({ params }: PageProps<"/papers/[id]">) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("papers").select("id, paper, config, answers, result, status, deadline_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  const paper = p.paper as Paper;
  const cfg = p.config as PaperConfig;
  if (p.status === "marked") return <Results id={p.id} paper={paper} cfg={cfg} result={p.result as PaperResult} answers={p.answers ?? {}} />;
  // Never send answer keys, criteria or model answers to the browser while the paper is open.
  const safe: Paper = { ...paper, sections: paper.sections.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q, answer: null, criteria: "-", sample: "-" })) })) };
  return <PaperView id={p.id} paper={safe} cfg={cfg} initialAnswers={p.answers ?? {}} deadline={p.deadline_at} marking={p.status === "marking"} />;
}
