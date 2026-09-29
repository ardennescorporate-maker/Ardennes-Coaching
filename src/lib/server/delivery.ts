import "server-only";
import webpush from "web-push";
import { adminClient } from "@/lib/supabase/admin";
import { inQuietHours, localParts } from "@/lib/domain/schedule";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const pushReady = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (pushReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@studypilot.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

/** Sends an email through Resend's REST API (no-op without RESEND_API_KEY). */
export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "StudyPilot <hello@studypilot.app>", to, subject, html }),
  });
  if (!res.ok) console.error("resend", res.status, await res.text().catch(() => ""));
  return res.ok;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function emailHtml(items: { title: string; body: string | null; href: string | null }[]) {
  return `<div style="font-family:Nunito,Arial,sans-serif;max-width:520px;margin:auto;color:#0F1E3D">
<h2 style="color:#2F7BF5">G'day from Pip!</h2>
${items.map((i) => `<p><strong>${esc(i.title)}</strong>${i.body ? `<br>${esc(i.body)}` : ""}${i.href ? `<br><a href="${site()}${esc(i.href)}" style="color:#2F7BF5">Open StudyPilot</a>` : ""}</p>`).join("")}
<p style="color:#8593AD;font-size:12px">You're getting this because email notifications are on. Change this in Settings → Notifications.</p></div>`;
}

/**
 * Delivers recent in-app notifications by push and email, per each user's channel
 * settings, outside their quiet hours. Batched: one email per user per run.
 */
export async function deliverPending(now = new Date()) {
  const db = adminClient();
  const since = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data: pending } = await db
    .from("notifications")
    .select("id, user_id, category, title, body, href, emailed_at, pushed_at")
    .gte("created_at", since)
    .is("read_at", null)
    .or("emailed_at.is.null,pushed_at.is.null")
    .limit(2000);
  if (!pending?.length) return { pushed: 0, emailed: 0 };
  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const { data: users } = await db.from("profiles").select("id, email, timezone, notif_prefs, is_demo").in("id", userIds);
  let pushed = 0;
  let emailed = 0;
  for (const u of users ?? []) {
    if (u.is_demo) continue;
    const prefs = u.notif_prefs ?? {};
    const lp = localParts(now, u.timezone);
    const hhmm = `${String(lp.hour).padStart(2, "0")}:${String(lp.minute).padStart(2, "0")}`;
    if (inQuietHours(hhmm, prefs.quietStart ?? "22:00", prefs.quietEnd ?? "07:00")) continue;
    const mine = pending.filter((n) => n.user_id === u.id);

    if (prefs.push && pushReady) {
      const toPush = mine.filter((n) => !n.pushed_at);
      const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, keys").eq("user_id", u.id);
      for (const n of toPush.slice(-3)) {
        for (const s of subs ?? []) {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: n.title, body: n.body ?? "", href: n.href ?? "/home" }), { TTL: 3600 });
            pushed++;
          } catch (e) {
            const code = (e as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // expired
          }
        }
      }
      if (toPush.length) await db.from("notifications").update({ pushed_at: now.toISOString() }).in("id", toPush.map((n) => n.id));
    }
    if (prefs.email && u.email) {
      const toEmail = mine.filter((n) => !n.emailed_at);
      if (toEmail.length && (await sendEmail(u.email, toEmail.length === 1 ? toEmail[0].title : `${toEmail.length} updates from Pip`, emailHtml(toEmail)))) {
        emailed++;
        await db.from("notifications").update({ emailed_at: now.toISOString() }).in("id", toEmail.map((n) => n.id));
      }
    }
  }
  return { pushed, emailed };
}
