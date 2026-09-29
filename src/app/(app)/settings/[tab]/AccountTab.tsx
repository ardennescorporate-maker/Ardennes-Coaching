"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { changeEmailAction, changePasswordAction, confirmEmailAction, deleteAccountAction, type SettingsState } from "../actions";
import { signOutAction } from "@/app/(auth)/actions";
import { Msg, Save } from "./bits";

export function AccountTab({ email, provider, demo }: { email: string; provider: string; demo: boolean }) {
  const [emailState, emailAction] = useActionState<SettingsState, FormData>(changeEmailAction, null);
  const [confirmState, confirmAction] = useActionState<SettingsState, FormData>(confirmEmailAction, null);
  const [pwState, pwAction] = useActionState<SettingsState, FormData>(changePasswordAction, null);
  const [delState, delAction] = useActionState<SettingsState, FormData>(deleteAccountAction, null);
  const pendingEmail = confirmState?.step ?? emailState?.step;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Email" sub={`Signed in as ${email}${provider !== "email" ? ` with ${provider[0].toUpperCase()}${provider.slice(1)}` : ""}`} />
        {!pendingEmail || confirmState?.ok ? (
          <form action={emailAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="label">New email</span>
              <input name="email" type="email" required className="field" disabled={demo} />
            </label>
            <Save>Change email</Save>
          </form>
        ) : (
          <form action={confirmAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="email" value={pendingEmail} />
            <label className="block flex-1">
              <span className="label">Code sent to {pendingEmail}</span>
              <input name="code" inputMode="numeric" maxLength={6} required className="field num tracking-[0.4em]" autoComplete="one-time-code" />
            </label>
            <Save>Confirm</Save>
          </form>
        )}
        <div className="mt-3">
          <Msg state={confirmState ?? emailState} />
        </div>
      </Card>

      {provider === "email" && (
        <Card>
          <CardHeader title="Password" />
          <form action={pwAction} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Current password</span>
              <input name="current" type="password" autoComplete="current-password" required className="field" aria-invalid={pwState?.field === "current"} disabled={demo} />
            </label>
            <label className="block">
              <span className="label">New password</span>
              <input name="next" type="password" autoComplete="new-password" minLength={8} required className="field" aria-invalid={pwState?.field === "next"} disabled={demo} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Save>Change password</Save>
              <Msg state={pwState} />
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title="Session" />
        <div className="flex flex-wrap gap-3">
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary">
              Switch account
            </button>
          </form>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-secondary">
              Log out
            </button>
          </form>
          <Link href="/login" className="btn btn-ghost">
            Accounts on this device
          </Link>
        </div>
      </Card>

      <Card className="border-[color-mix(in_srgb,var(--bad)_35%,var(--line))]">
        <CardHeader title="Delete account" sub="This permanently deletes your account and all your study data. It can't be undone." />
        <form action={delAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="label">Type DELETE to confirm</span>
            <input name="confirm" required autoComplete="off" className="field" disabled={demo} />
          </label>
          <Save variant="danger-solid">Delete my account</Save>
        </form>
        <div className="mt-3">
          <Msg state={delState} />
        </div>
      </Card>
    </div>
  );
}
