import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";

export function SubscriptionTab({ isBeta, code, launchPlan, joined, history }: { isBeta: boolean; code: string | null; launchPlan: string | null; joined: string | null; history: { id: string; date: string; amount: number; currency: string; status: string; url: string | null }[] }) {
  const planName = (p: string | null) => (p === "premium_exam" ? "Premium Exam" : p === "premium" ? "Premium" : p === "free" ? "Free" : "Not chosen yet");
  return (
    <div className="flex flex-col gap-5">
      <Card className="!bg-yellow-soft">
        <CardHeader title="Beta All-Access" sub="Every feature from Premium Exam is unlocked and free until StudyPilot launches. No card needed." />
        {isBeta && (
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="micro text-ink-3">Invite code</dt>
              <dd className="num font-bold">{code ?? "—"}</dd>
            </div>
            <div>
              <dt className="micro text-ink-3">Joined</dt>
              <dd className="font-bold">{joined ? new Date(joined).toLocaleDateString("en-AU", { dateStyle: "medium" }) : "—"}</dd>
            </div>
            <div>
              <dt className="micro text-ink-3">Your pick for launch</dt>
              <dd className="font-bold">{planName(launchPlan)}</dd>
            </div>
          </dl>
        )}
      </Card>
      <Card>
        <CardHeader title="Plans" sub="Free · Premium $20/month · Premium Exam $30/month (AUD)" action={<Link href="/plans" className="btn btn-secondary btn-sm">Compare plans</Link>} />
      </Card>
      <Card>
        <CardHeader title="Billing history" />
        {history.length === 0 ? (
          <p className="text-ink-3">No payments yet.{isBeta ? " You won't be charged during the beta." : ""}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                <span>{new Date(h.date).toLocaleDateString("en-AU", { dateStyle: "medium" })}</span>
                <span className="num">
                  ${h.amount.toFixed(2)} {h.currency}
                </span>
                <span className="pill pill-muted">{h.status}</span>
                {h.url && (
                  <a href={h.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-ink">
                    Invoice
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
