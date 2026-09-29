import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { allow } from "@/lib/server/ratelimit";
import { DAILY_HARD_CAP, LIMITS, effectivePlan, type AiKind, type PlanId } from "@/lib/domain/plans";
import { AI_MOCK, AiError, MODEL_FAST, MODEL_STRONG, anthropic } from "./client";
import { mockTutorStream } from "./mock";

export { AiError, aiErrorMessage, AI_MOCK } from "./client";

export type AiUser = { userId: string; plan: PlanId; isBeta: boolean };
type Effort = "low" | "medium" | "high";

// ─── Quotas and logging ─────────────────────────────────────────────────────

/** Throws AiError if the user is over their rate limit or plan quota. */
export async function checkQuota(u: AiUser, kind: AiKind) {
  if (!(await allow(`ai:${u.userId}:${kind}`, kind === "tutor" ? 20 : 8, 60))) {
    throw new AiError("rate_limited", "Whoa, that's a lot of questions at once! Give me a minute to catch my breath.");
  }
  const db = adminClient();
  const dayStart = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count: daily } = await db.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", u.userId).gte("created_at", dayStart);
  if ((daily ?? 0) >= DAILY_HARD_CAP) throw new AiError("quota", "You've reached today's AI limit. It resets tomorrow.");

  const limit = LIMITS[effectivePlan(u.plan, u.isBeta)][kind];
  if (limit.max === null) return;
  if (limit.max === 0) throw new AiError("quota", "This feature is part of Premium. See Plans to upgrade.");
  const since = new Date(Date.now() - (limit.per === "day" ? 1 : 30) * 24 * 3600_000).toISOString();
  const { count } = await db.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", u.userId).eq("kind", kind).eq("ok", true).gte("created_at", since);
  if ((count ?? 0) >= limit.max) {
    throw new AiError("quota", `You've used your ${limit.max} free ${kind === "tutor" ? "questions" : "uses"} this ${limit.per}. Upgrade on the Plans page for more.`);
  }
}

export async function logUsage(userId: string | null, kind: AiKind, model: string, usage: { input_tokens?: number; output_tokens?: number } | null, ok: boolean) {
  const { error } = await adminClient()
    .from("ai_usage")
    .insert({ user_id: userId, kind, model, input_tokens: usage?.input_tokens ?? 0, output_tokens: usage?.output_tokens ?? 0, ok });
  if (error) console.error("ai usage log", error.message);
}

// ─── Structured JSON output ─────────────────────────────────────────────────

type StructuredArgs<S extends z.ZodType> = {
  user: AiUser;
  kind: AiKind;
  tier: "fast" | "strong";
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  /** Schema sent to the API (keep it simple: no min/max). */
  schema: S;
  /** Stricter check applied after parsing; return an error message to retry. */
  validate?: (v: z.infer<S>) => string | null;
  maxTokens?: number;
  effort?: Effort;
  /** Skip quota (e.g. evidence checks counted elsewhere). */
  skipQuota?: boolean;
  /** Canned output for mock mode (local dev and tests without an API key). */
  mock: () => z.infer<S>;
};

/**
 * One Claude call that must return JSON matching `schema`.
 * Retries up to twice when the output is missing or fails `validate`.
 */
export async function structured<S extends z.ZodType>(a: StructuredArgs<S>): Promise<z.infer<S>> {
  if (!a.skipQuota) await checkQuota(a.user, a.kind);
  if (AI_MOCK) {
    const v = a.mock();
    await logUsage(a.user.userId, a.kind, "mock", null, true);
    return v;
  }
  const model = a.tier === "fast" ? MODEL_FAST : MODEL_STRONG;
  const strong = a.tier === "strong";
  let lastProblem = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: a.content }];
    if (lastProblem) messages.push({ role: "user", content: `Your previous answer was rejected: ${lastProblem}. Return corrected JSON only.` });
    try {
      // Streaming keeps long generations (papers, lessons) clear of HTTP timeouts.
      const stream = anthropic().beta.messages.stream({
        model,
        max_tokens: a.maxTokens ?? 16000,
        system: a.system,
        messages,
        output_config: { format: betaZodOutputFormat(a.schema), ...(strong ? { effort: a.effort ?? "medium" } : {}) },
        // Server-side fallback keeps a refused request answerable on a fallback model.
        ...(strong ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      });
      const msg = await stream.finalMessage();
      await logUsage(a.user.userId, a.kind, msg.model, msg.usage, msg.stop_reason !== "refusal");
      if (msg.stop_reason === "refusal") throw new AiError("refused", "Pip can't help with that one. Try rephrasing, or ask about something on your syllabus.");
      if (msg.stop_reason === "max_tokens") {
        lastProblem = "it was cut off; be more concise";
        continue;
      }
      const parsed = msg.parsed_output as z.infer<S> | null;
      if (!parsed) {
        lastProblem = "it was not valid JSON for the schema";
        continue;
      }
      const problem = a.validate?.(parsed) ?? null;
      if (!problem) return parsed;
      lastProblem = problem;
    } catch (e) {
      if (e instanceof AiError) throw e;
      if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
        await logUsage(a.user.userId, a.kind, model, null, false);
        throw e;
      }
      // Parse errors and transient failures: retry.
      lastProblem = "it could not be parsed";
      if (attempt === 2) throw e;
    }
  }
  throw new AiError("invalid_output", "Pip got a bit muddled writing that. Please try again.");
}

// ─── Streaming tutor ────────────────────────────────────────────────────────

/** Streams Pip's reply as plain text chunks. `onDone` receives the full text. */
export async function streamText(args: {
  user: AiUser;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  signal?: AbortSignal;
  onDone: (full: string, ok: boolean) => Promise<void>;
}): Promise<ReadableStream<Uint8Array>> {
  await checkQuota(args.user, "tutor");
  const enc = new TextEncoder();

  if (AI_MOCK) {
    const last = args.messages.at(-1);
    const q = typeof last?.content === "string" ? last.content : "";
    return new ReadableStream({
      async start(ctrl) {
        let full = "";
        for await (const chunk of mockTutorStream(q)) {
          if (args.signal?.aborted) break;
          full += chunk;
          ctrl.enqueue(enc.encode(chunk));
        }
        await logUsage(args.user.userId, "tutor", "mock", null, true);
        await args.onDone(full, true);
        ctrl.close();
      },
    });
  }

  const stream = anthropic().beta.messages.stream(
    {
      model: MODEL_STRONG,
      max_tokens: 4000,
      system: args.system,
      messages: args.messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal: args.signal },
  );

  return new ReadableStream({
    async start(ctrl) {
      let full = "";
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            full += ev.delta.text;
            ctrl.enqueue(enc.encode(ev.delta.text));
          }
        }
        const msg = await stream.finalMessage();
        await logUsage(args.user.userId, "tutor", msg.model, msg.usage, msg.stop_reason !== "refusal");
        if (msg.stop_reason === "refusal" && !full) {
          full = "I can't help with that one. Let's get back to your studies — what topic are you working on?";
          ctrl.enqueue(enc.encode(full));
        }
        await args.onDone(full, true);
      } catch (e) {
        if (!args.signal?.aborted) {
          const note = "\n\n_Sorry, I lost my connection. Please try again._";
          ctrl.enqueue(enc.encode(note));
          console.error("tutor stream", e);
        }
        await args.onDone(full, false);
      } finally {
        ctrl.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
}
