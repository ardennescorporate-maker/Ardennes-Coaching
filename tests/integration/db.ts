import pg from "pg";
import { randomUUID } from "node:crypto";

export const DB_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/studypilot";
export const pool = new pg.Pool({ connectionString: DB_URL, max: 4 });

/** Creates an auth user (the trigger creates the profile). */
export async function makeUser(email = `t-${randomUUID()}@test.dev`, opts: { beta?: boolean; onboard?: boolean } = {}) {
  const id = randomUUID();
  await pool.query("insert into auth.users (id, email, aud, role, instance_id) values ($1, $2, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000')", [id, email]);
  if (opts.beta) await pool.query("update profiles set beta_joined_at = now() where id = $1", [id]);
  if (opts.onboard) await pool.query("update profiles set username = $2, onboarded_at = now() where id = $1", [id, `u${id.slice(0, 8)}`]);
  return id;
}

/** Runs queries as an authenticated user, the way PostgREST does (role + JWT claims). */
export async function asUser<T>(userId: string, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
    await c.query("set local role authenticated");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
