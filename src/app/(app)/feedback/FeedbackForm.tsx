"use client";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChipGroup } from "@/components/ui/Chip";
import { Pip } from "@/components/pip/Pip";
import { useRewards } from "@/components/rewards/Rewards";
import { sendFeedbackAction } from "./actions";
import { FEEDBACK_CATEGORIES } from "@/lib/domain/feedback";

type Cat = (typeof FEEDBACK_CATEGORIES)[number];

export function FeedbackForm() {
  const [category, setCategory] = useState<Cat>("Bug report");
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const celebrate = useRewards();
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Pip mood="talk" size={70} />
        <CardHeader title="Send feedback" sub="Beta features are experimental. Tell us what's broken, confusing or brilliant. Every report is read." />
      </div>
      <form
        className="mt-2 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await sendFeedbackAction({ category, rating, body, page: document.referrer ? new URL(document.referrer).pathname : undefined });
            if (r.error) return setMsg({ error: r.error });
            setMsg({ ok: "Thanks! Your report is in. You'll get a notification when its status changes." });
            setBody("");
            setRating(null);
            if (r.badges?.length) celebrate({ awarded: 0, xp: 0, level: 0, leveledUp: false, badges: r.badges });
          });
        }}
      >
        <div>
          <span className="label">Category</span>
          <ChipGroup label="Category" options={FEEDBACK_CATEGORIES} value={category} onChange={setCategory} />
        </div>
        <div>
          <span className="label">
            Overall rating <span className="font-semibold text-ink-3">(optional)</span>
          </span>
          <div role="radiogroup" aria-label="Overall rating" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(rating === n ? null : n)} className="rounded-lg p-1 text-yellow-deep">
                <Star size={30} fill={rating !== null && n <= rating ? "var(--yellow)" : "none"} />
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">Details</span>
          <textarea
            className="field"
            rows={6}
            required
            minLength={3}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={category === "Bug report" ? "What happened? What did you expect? Which page were you on?" : "Tell us more…"}
          />
        </label>
        {msg && (
          <p role={msg.error ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm font-bold ${msg.error ? "bg-bad-soft text-bad-ink" : "bg-good-soft text-good-ink"}`}>
            {msg.error ?? msg.ok}
          </p>
        )}
        <div>
          <button className="btn btn-primary" disabled={pending || body.trim().length < 3}>
            {pending ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </form>
    </Card>
  );
}
