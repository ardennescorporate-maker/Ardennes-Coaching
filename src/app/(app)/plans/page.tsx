import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireViewer } from "@/lib/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { BILLING_ENABLED } from "@/lib/server/billing";
import { PlanCards } from "./PlanCards";

export const metadata: Metadata = { title: "Plans" };

const ROWS: [string, string, string, string][] = [
  ["AI tutor", "15 questions/day", "Unlimited", "Unlimited"],
  ["Quizzes", "Limited", "Unlimited", "Unlimited"],
  ["AI exam papers", "3/month", "20/month", "Unlimited"],
  ["HSC/SAT/AP/IB formats", "✓", "✓", "✓"],
  ["AI marking and feedback", "3/month", "20/month", "Unlimited, detailed"],
  ["Full timed simulations", "—", "—", "✓"],
  ["Performance predictions", "—", "Basic", "✓"],
  ["Flashcard generator", "—", "✓", "✓"],
  ["Study planner", "Basic", "✓ with AI timeline", "✓ with AI timeline"],
  ["Analytics", "Basic", "Advanced", "Advanced"],
  ["Groups, XP, streaks and leaderboards", "✓", "✓", "✓"],
];

export default async function PlansPage({ searchParams }: PageProps<"/plans">) {
  const v = await requireViewer();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: code } = v.profile.beta_code_id ? await supabase.from("beta_codes").select("code").eq("id", v.profile.beta_code_id).maybeSingle() : { data: null };
  return (
    <div className="flex flex-col gap-5">
      {v.isBeta && (
        <div className="card card-pad !border-yellow !bg-yellow-soft">
          <p className="font-bold">
            <span className="beta-tag mr-2">BETA</span>
            You&apos;re on <strong>Beta All-Access</strong>: every feature from Premium Exam is unlocked and free until StudyPilot launches. No card needed.
            {code?.code && (
              <>
                {" "}
                Your code: <code className="num">{code.code}</code>
              </>
            )}
          </p>
        </div>
      )}
      {sp.billing === "success" && <p className="rounded-xl bg-good-soft px-3 py-2 font-bold text-good">Thanks! Your subscription is active.</p>}

      <PlanCards launchPlan={v.profile.launch_plan} billing={BILLING_ENABLED && !v.isBeta} currentPlan={v.profile.plan} />

      <Card>
        <CardHeader title="Compare plans" />
        <div className="scroll-x">
          <table className="table min-w-[620px]">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free</th>
                <th>Premium</th>
                <th>Premium Exam</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([f, ...cells]) => (
                <tr key={f}>
                  <td className="font-bold">{f}</td>
                  {cells.map((c, i) => (
                    <td key={i} className="text-ink-2">
                      {c === "✓" ? <Check size={18} className="text-good" aria-label="Included" /> : c === "—" ? <Minus size={18} className="text-ink-3" aria-label="Not included" /> : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="What happens after the beta?" />
          <p className="text-ink-2">
            When StudyPilot launches, beta testers keep their progress, XP, badges and the Beta Pioneer badge. You&apos;ll move to the Free plan unless you choose a paid plan, and we&apos;ll tell you well before anything changes. The plan you pick for launch helps us set fair prices.
          </p>
        </Card>
        <Card>
          <CardHeader title="Billing" />
          <p className="text-ink-2">Prices are in Australian dollars, billed monthly through Stripe. Cancel any time and keep access until the end of the month you paid for. No card is needed during the beta.</p>
        </Card>
      </div>
    </div>
  );
}
