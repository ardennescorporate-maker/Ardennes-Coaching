import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { scoreTone } from "@/lib/domain/bands";
import { Generator } from "./Generator";

export const metadata: Metadata = { title: "Exam Papers" };

export default async function PapersPage() {
  const v = await requireViewer();
  const supabase = await createClient();
  const { data: papers } = await supabase.from("papers").select("id, paper->>title, config->>subject, status, pct, band, score, max_score, created_at").order("created_at", { ascending: false }).limit(50);
  const fmt = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: v.profile.timezone });
  return (
    <div className="flex flex-col gap-5">
      <Generator subjects={v.profile.subjects} system={v.profile.system ?? "NSW HSC"} year={v.profile.year_level ?? "Year 12"} />
      <Card>
        <CardHeader title="Paper history" sub="Weak topics from marked papers feed your planner and Pip's tips." />
        {!papers?.length ? (
          <p className="text-ink-3">No papers yet. Generate one above, or try the sample HSC Maths paper.</p>
        ) : (
          <div className="scroll-x">
            <table className="table min-w-[560px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Paper</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td className="num whitespace-nowrap">{fmt.format(new Date(p.created_at))}</td>
                    <td>
                      <Link href={`/papers/${p.id}`} className="font-extrabold text-blue hover:underline">
                        {p.title}
                      </Link>
                      <span className="block text-xs text-ink-3">{p.subject}</span>
                    </td>
                    <td className="num whitespace-nowrap">{p.status === "marked" ? `${p.score}/${p.max_score} · ${p.pct}%` : p.status === "marking" ? "Marking…" : "In progress"}</td>
                    <td>{p.status === "marked" ? <span className={`pill pill-${scoreTone(p.pct ?? 0)}`}>{p.band}</span> : <Link href={`/papers/${p.id}`} className="pill">Resume</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
