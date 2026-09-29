import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL_FAST = process.env.AI_MODEL_FAST || "claude-haiku-4-5";
export const MODEL_STRONG = process.env.AI_MODEL_STRONG || "claude-opus-5-5";

/** Mock mode returns canned responses: explicit AI_MOCK=1, or no key outside production. */
export const AI_MOCK = process.env.AI_MOCK === "1" || (!process.env.ANTHROPIC_API_KEY && process.env.NODE_ENV !== "production");

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AiError("not_configured", "Pip's AI isn't set up on this server yet.");
  // SDK retries 408/409/429/5xx and connection errors (maxRetries).
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3, timeout: 120_000 });
  return client;
}

export type AiErrorCode = "not_configured" | "quota" | "rate_limited" | "refused" | "invalid_output" | "upstream";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Friendly message for any error thrown by the AI layer. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof AiError) return e.message;
  if (e instanceof Anthropic.RateLimitError) return "Pip is very busy right now. Try again in a minute.";
  if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) return "Pip's brain is having a hiccup. Try again in a moment.";
  if (e instanceof Anthropic.APIConnectionError) return "Pip couldn't connect. Check your internet and try again.";
  console.error("AI error", e);
  return "Something went wrong with Pip. Try again, and send feedback if it keeps happening.";
}
