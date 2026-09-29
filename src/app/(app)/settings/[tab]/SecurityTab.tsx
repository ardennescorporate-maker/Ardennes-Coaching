"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { browserClient } from "@/lib/supabase/browser";

type Login = { at: string; method: string; device: string | null; ip: string | null };
type Factor = { id: string; status: string };

export function SecurityTab({ history, tz }: { history: Login[]; tz: string }) {
  const [factor, setFactor] = useState<Factor | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const supabase = browserClient();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      setFactor((data?.totp?.[0] as Factor | undefined) ?? null);
    })();
  }, [supabase]);

  async function start() {
    setMsg(null);
    // Clear any half-finished enrolment first.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `StudyPilot ${Date.now()}` });
    if (error || !data) return setMsg({ error: "We couldn't start two-factor setup. Try again." });
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function verify() {
    if (!enroll) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\D/g, "") });
    if (error) return setMsg({ error: "That code didn't match. Try the newest code in your app." });
    setFactor({ id: enroll.id, status: "verified" });
    setEnroll(null);
    setCode("");
    setMsg({ ok: "Two-factor authentication is on." });
  }
  async function disable() {
    if (!factor) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return setMsg({ error: "Log out and back in with your code, then try again." });
    setFactor(null);
    setMsg({ ok: "Two-factor authentication is off." });
  }

  const fmt = new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: tz });
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Two-factor authentication" sub="Use an authenticator app (like Google Authenticator or 1Password) for a code when you log in." />
        {factor === undefined ? (
          <p className="text-ink-3">Checking…</p>
        ) : factor?.status === "verified" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill pill-good">
              <ShieldCheck size={14} /> On
            </span>
            <button type="button" className="btn btn-danger" onClick={disable}>
              Turn off
            </button>
          </div>
        ) : enroll ? (
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl bg-white p-2" />
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-2">
                Scan the QR code, or enter this key: <code className="num break-all font-bold text-ink">{enroll.secret}</code>
              </p>
              <label className="block">
                <span className="label">6-digit code</span>
                <input className="field num tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
              </label>
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary" onClick={verify}>
                  Turn on
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setEnroll(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start}>
            Set up two-factor
          </button>
        )}
        {msg && (
          <p role={msg.error ? "alert" : "status"} className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${msg.error ? "bg-bad-soft text-bad-ink" : "bg-good-soft text-good-ink"}`}>
            {msg.error ?? msg.ok}
          </p>
        )}
      </Card>
      <Card>
        <CardHeader title="Login history" sub="If you don't recognise a login, change your password." />
        <div className="scroll-x">
          <table className="table min-w-[520px]">
            <thead>
              <tr>
                <th>When</th>
                <th>Method</th>
                <th>Device</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-ink-3">
                    No logins recorded yet.
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr key={h.at}>
                  <td className="num whitespace-nowrap">{fmt.format(new Date(h.at))}</td>
                  <td>{h.method}</td>
                  <td>{h.device ?? "—"}</td>
                  <td className="num">{h.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
