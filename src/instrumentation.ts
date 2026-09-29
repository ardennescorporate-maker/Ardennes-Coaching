import type { Instrumentation } from "next";

/** Server error hook: logs every unhandled request error; forwards to Sentry when configured. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as Error & { digest?: string };
  console.error(`[${context.routeType}] ${request.method} ${request.path}`, e.digest ?? "", e.message);
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // Minimal Sentry envelope over HTTP (no SDK): https://develop.sentry.dev/sdk/envelopes/
    const u = new URL(dsn);
    const projectId = u.pathname.replace("/", "");
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const header = JSON.stringify({ event_id: eventId, dsn, sent_at: new Date().toISOString() });
    const event = JSON.stringify({
      event_id: eventId,
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: "error",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      request: { method: request.method, url: request.path },
      tags: { routeType: context.routeType, routePath: context.routePath },
      exception: { values: [{ type: e.name, value: e.message, stacktrace: undefined }] },
    });
    await fetch(`${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_key=${u.username}&sentry_version=7`, {
      method: "POST",
      body: `${header}\n${JSON.stringify({ type: "event" })}\n${event}`,
    });
  } catch {
    // Never let error reporting break a request.
  }
};
