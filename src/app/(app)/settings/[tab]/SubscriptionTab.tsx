import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";

export function SubscriptionTab({ isBeta, code, launchPlan, joined }: { isBeta: boolean; code: string | null; launchPlan: string | null; joined: string | null }) {
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
        <p className="text-ink-3">No payments yet. You won&apos;t be charged during the beta.</p>
      </Card>
    </div>
  );
}
