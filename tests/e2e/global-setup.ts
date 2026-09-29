import pg from "pg";

/** Clears rate-limit counters on the local dev database so repeated runs don't lock themselves out. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/studypilot";
  if (!/localhost|127\.0\.0\.1/.test(url)) return;
  const c = new pg.Client({ connectionString: url });
  try {
    await c.connect();
    await c.query("delete from public.rate_limits");
    await c.query("delete from public.beta_code_attempts");
  } catch {
    // No local DB (e.g. testing a deployed preview): nothing to reset.
  } finally {
    await c.end().catch(() => {});
  }
}
