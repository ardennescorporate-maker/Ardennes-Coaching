import type { Metadata } from "next";
import { requireAdmin } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";
import { levelFor } from "@/lib/domain/levels";
import { addDays } from "@/lib/domain/dates";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = { title: "Beta Admin" };

export default async function AdminPage() {
  const v = await requireAdmin();
  const db = adminClient();
  const weekAgo = addDays(v.today, -7);
  const since7 = `${weekAgo}T00:00:00Z`;

  const [profiles, codes, feedback, visits, ai, papers, sessionsFlagged, hidden, xpToday, xpWeek, aiTotal] = await Promise.all([
    db.from("profiles").select("id, username, email, created_at, xp, study_minutes, beta_code_id, beta_joined_at, beta_removed_at, is_demo, role").order("created_at", { ascending: false }),
    db.from("beta_codes").select("id, code, max_uses, uses, active, created_at").order("created_at", { ascending: false }),
    db.from("feedback").select("id, user_id, category, rating, body, priority, status, created_at").order("created_at", { ascending: false }).limit(300),
    db.from("feature_visits").select("feature, count").gte("day", addDays(v.today, -30)),
    db.from("ai_usage").select("user_id, kind"),
    db.from("papers").select("status"),
    db.from("study_sessions").select("id, user_id, subject, minutes, flag_reason, evidence_path, created_at").eq("review_status", "pending").order("created_at"),
    db.from("group_announcements").select("id, body, reports, group_id, created_at").eq("hidden", true),
    db.from("xp_events").select("user_id").eq("day", v.today),
    db.from("xp_events").select("user_id").gte("day", weekAgo),
    db.from("ai_usage").select("id", { count: "exact", head: true }),
  ]);

  const users = profiles.data ?? [];
  const beta = users.filter((u) => u.beta_joined_at && !u.beta_removed_at && !u.is_demo);
  const byId = new Map(users.map((u) => [u.id, u]));
  const aiByUser = new Map<string, number>();
  for (const r of ai.data ?? []) if (r.user_id) aiByUser.set(r.user_id, (aiByUser.get(r.user_id) ?? 0) + 1);
  const activeToday = new Set((xpToday.data ?? []).map((r) => r.user_id));
  const activeWeek = new Set((xpWeek.data ?? []).map((r) => r.user_id));
  const cohort = users.filter((u) => !u.is_demo && u.beta_joined_at && u.created_at < since7);
  const retention = cohort.length ? Math.round((cohort.filter((u) => activeWeek.has(u.id)).length / cohort.length) * 100) : null;
  const ratings = (feedback.data ?? []).map((f) => f.rating).filter((r): r is number => typeof r === "number");
  const featureCounts = new Map<string, number>();
  for (const r of visits.data ?? []) featureCounts.set(r.feature, (featureCounts.get(r.feature) ?? 0) + r.count);
  const codeUsers = new Map<string, string[]>();
  for (const u of users) if (u.beta_code_id) codeUsers.set(u.beta_code_id, [...(codeUsers.get(u.beta_code_id) ?? []), u.username ?? u.email ?? "?"]);

  return (
    <AdminClient
      sentryUrl={process.env.SENTRY_DASHBOARD_URL || null}
      stats={{
        betaUsers: beta.length,
        totalAccounts: users.filter((u) => !u.is_demo).length,
        dau: activeToday.size,
        retention,
        aiRequests: aiTotal.count ?? 0,
        papersGenerated: (papers.data ?? []).length,
        papersMarked: (papers.data ?? []).filter((p) => p.status === "marked").length,
        studyHours: Math.round(users.reduce((a, u) => a + u.study_minutes, 0) / 60),
        avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      }}
      codes={(codes.data ?? []).map((c) => ({ ...c, joined: codeUsers.get(c.id) ?? [] }))}
      users={users
        .filter((u) => u.beta_joined_at && !u.is_demo)
        .map((u) => ({
          id: u.id,
          username: u.username ?? "—",
          email: u.email ?? "—",
          code: codes.data?.find((c) => c.id === u.beta_code_id)?.code ?? "—",
          joined: u.beta_joined_at!,
          level: levelFor(u.xp),
          hours: Math.round((u.study_minutes / 60) * 10) / 10,
          ai: aiByUser.get(u.id) ?? 0,
          removed: Boolean(u.beta_removed_at),
          isAdmin: u.role === "admin",
        }))}
      features={[...featureCounts.entries()].sort((a, b) => b[1] - a[1]).map(([feature, count]) => ({ feature, count }))}
      feedback={(feedback.data ?? []).map((f) => ({ ...f, user: (f.user_id && byId.get(f.user_id)?.username) || "—" }))}
      flagged={(sessionsFlagged.data ?? []).map((s) => ({ ...s, user: byId.get(s.user_id)?.username ?? "—" }))}
      hidden={hidden.data ?? []}
      selfId={v.userId}
    />
  );
}
