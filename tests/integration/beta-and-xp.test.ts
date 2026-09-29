import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { asUser, makeUser, pool } from "./db";

const reachable = await pool
  .query("select 1 from public.profiles limit 1")
  .then(() => true)
  .catch(() => false);
const d = reachable ? describe : describe.skip;

d("beta invite codes", () => {
  const code = `T${randomUUID().slice(0, 6).toUpperCase()}-AB23`;
  const code1 = `O${randomUUID().slice(0, 6).toUpperCase()}-CD45`;
  const off = `X${randomUUID().slice(0, 6).toUpperCase()}-EF67`;
  beforeAll(async () => {
    await pool.query("insert into beta_codes (code, max_uses, active) values ($1, 5, true), ($2, 1, true), ($3, 5, false)", [code, code1, off]);
  });

  it("rejects invalid, disabled and used-up codes", async () => {
    const a = await makeUser();
    const b = await makeUser();
    const redeem = (u: string, c: string) => asUser(u, async (cl) => (await cl.query("select redeem_beta_code($1) r", [c])).rows[0].r);
    expect((await redeem(a, "NOPE-0000")).error).toBe("invalid");
    expect((await redeem(a, off)).error).toBe("disabled");
    expect((await redeem(a, code1.toLowerCase())).ok).toBe(true);
    expect((await redeem(b, code1)).error).toBe("used_up");
  });

  it("joins the beta, counts the use and grants Beta Pioneer", async () => {
    const u = await makeUser();
    const r = await asUser(u, async (c) => (await c.query("select redeem_beta_code($1) r", [` ${code} `])).rows[0].r);
    expect(r.ok).toBe(true);
    const p = (await pool.query("select beta_joined_at, plan from profiles where id = $1", [u])).rows[0];
    expect(p.beta_joined_at).not.toBeNull();
    expect(p.plan).toBe("premium_exam");
    expect((await pool.query("select uses from beta_codes where code = $1", [code])).rows[0].uses).toBe(1);
    expect((await pool.query("select 1 from user_achievements where user_id = $1 and achievement_id = 'beta_pioneer'", [u])).rowCount).toBe(1);
    // Retrying with the same code doesn't use another seat.
    await asUser(u, (c) => c.query("select redeem_beta_code($1)", [code]));
    expect((await pool.query("select uses from beta_codes where code = $1", [code])).rows[0].uses).toBe(1);
  });

  it("locks out after 8 failed attempts", async () => {
    const u = await makeUser();
    for (let i = 0; i < 8; i++) await asUser(u, (c) => c.query("select redeem_beta_code('WRONG-0000')"));
    const r = await asUser(u, async (c) => (await c.query("select redeem_beta_code($1) r", [code])).rows[0].r);
    expect(r.error).toBe("locked");
  });
});

d("xp, streaks and protected columns", () => {
  it("awards xp once per ref, levels up and notifies", async () => {
    const u = await makeUser(undefined, { beta: true });
    const award = async (amt: number, reason: string, ref: string | null) => (await pool.query("select award_xp($1, $2, $3, $4) r", [u, amt, reason, ref])).rows[0].r;
    const r1 = await award(45, "homework", "hw-1");
    expect(r1).toMatchObject({ awarded: 45, xp: 45, level: 2, leveledUp: true, streak: 1 });
    const r2 = await award(45, "homework", "hw-1");
    expect(r2.duplicate).toBe(true);
    expect((await pool.query("select xp from profiles where id = $1", [u])).rows[0].xp).toBe(45);
    expect((await pool.query("select count(*)::int n from notifications where user_id = $1 and title like 'Level 2%'", [u])).rows[0].n).toBe(1);
  });

  it("continues the streak from yesterday and resets after a gap", async () => {
    const u = await makeUser();
    await pool.query("update profiles set streak = 6, last_study_date = (now() at time zone timezone)::date - 1 where id = $1", [u]);
    expect((await pool.query("select award_xp($1, 10, 'x') r", [u])).rows[0].r.streak).toBe(7);
    expect((await pool.query("select 1 from user_achievements where user_id = $1 and achievement_id = 'streak_7'", [u])).rowCount).toBe(1);
    await pool.query("update profiles set streak = 6, last_study_date = (now() at time zone timezone)::date - 3 where id = $1", [u]);
    expect((await pool.query("select award_xp($1, 10, 'x') r", [u])).rows[0].r.streak).toBe(1);
  });

  it("clamps awards to 0–1000", async () => {
    const u = await makeUser();
    expect((await pool.query("select award_xp($1, 99999, 'x') r", [u])).rows[0].r.awarded).toBe(1000);
    expect((await pool.query("select award_xp($1, -50, 'x') r", [u])).rows[0].r.awarded).toBe(0);
  });

  it("stops students writing xp, role or beta fields", async () => {
    const u = await makeUser();
    await expect(asUser(u, (c) => c.query("update profiles set xp = 99999 where id = $1", [u]))).rejects.toThrow(/permission denied/);
    await expect(asUser(u, (c) => c.query("update profiles set role = 'admin' where id = $1", [u]))).rejects.toThrow(/permission denied/);
    await expect(asUser(u, (c) => c.query("update profiles set beta_joined_at = now() where id = $1", [u]))).rejects.toThrow(/permission denied/);
    await expect(asUser(u, (c) => c.query("select award_xp($1, 10, 'x')", [u]))).rejects.toThrow(/permission denied/);
    // Allowed: own safe columns.
    await asUser(u, (c) => c.query("update profiles set goal = 'ATAR 99' where id = $1", [u]));
    expect((await pool.query("select goal from profiles where id = $1", [u])).rows[0].goal).toBe("ATAR 99");
  });

  it("hides other students' profiles and emails", async () => {
    const a = await makeUser();
    const b = await makeUser(undefined, { onboard: true });
    const rows = await asUser(a, async (c) => (await c.query("select id, email from profiles where id = $1", [b])).rows);
    expect(rows).toHaveLength(0);
    const pub = await asUser(a, async (c) => (await c.query("select * from public_profiles where id = $1", [b])).rows);
    expect(pub).toHaveLength(1);
    expect(pub[0]).not.toHaveProperty("email");
  });

  it("makes allow-listed emails admins", async () => {
    await pool.query("insert into admin_emails values ('boss@test.dev') on conflict do nothing");
    await pool.query("delete from auth.users where email = 'boss@test.dev'");
    const u = await makeUser("boss@test.dev");
    expect((await pool.query("select role from profiles where id = $1", [u])).rows[0].role).toBe("admin");
  });
});

afterAll(async () => {
  await pool.query("delete from auth.users where email like '%@test.dev'");
  await pool.end();
});
