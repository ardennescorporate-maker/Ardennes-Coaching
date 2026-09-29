import type { Metadata } from "next";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { FeedbackForm } from "./FeedbackForm";

export const metadata: Metadata = { title: "Beta Feedback" };

const STATUS_TONE: Record<string, string> = { New: "pill", Reviewing: "pill pill-yellow", Planned: "pill pill-yellow", Fixed: "pill pill-good", "Won't fix": "pill pill-muted" };

export default async function FeedbackPage() {
  const v = await requireViewer();
  const supabase = await createClient();
  const [{ data: reports }, { data: news }] = await Promise.all([
    supabase.from("feedback").select("id, category, body, status, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("announcements").select("id, body, created_at").order("created_at", { ascending: false }).limit(10),
  ]);
  const fmt = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: v.profile.timezone });
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <FeedbackForm />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Beta announcements" />
          {!news?.length ? (
            <p className="text-ink-3">No announcements yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {news.map((n) => (
                <li key={n.id} className="rounded-xl bg-yellow-soft p-3">
                  <p className="text-xs font-bold text-ink-3">{fmt.format(new Date(n.created_at))}</p>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Your reports" />
          {!reports?.length ? (
            <p className="text-ink-3">You haven&apos;t sent any feedback yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold">
                      {r.category} <span className="font-semibold text-ink-3">· {fmt.format(new Date(r.created_at))}</span>
                    </p>
                    <p className="line-clamp-2 text-sm text-ink-2">{r.body}</p>
                  </div>
                  <span className={STATUS_TONE[r.status] ?? "pill"}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
