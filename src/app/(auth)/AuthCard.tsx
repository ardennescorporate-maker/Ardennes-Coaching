"use client";
import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { loginAction, oauthAction, signUpAction, type FormState } from "./actions";
import { demoLoginAction } from "./demo-action";
import { FormMessage, Submit } from "./FormBits";
import { Stepper } from "./Stepper";
import { deviceAccountsStore, forgetDeviceAccount } from "@/lib/device-accounts";
import { Avatar } from "@/components/shell/Avatar";

const GOOGLE = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";
const APPLE = process.env.NEXT_PUBLIC_AUTH_APPLE === "1";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export function AuthCard({ mode, next, notice }: { mode: "signup" | "login"; next?: string; notice?: string }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "signup" ? signUpAction : loginAction, null);
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const accounts = useSyncExternalStore(deviceAccountsStore.subscribe, deviceAccountsStore.getSnapshot, deviceAccountsStore.getServerSnapshot);

  return (
    <div className="card card-pad sm:p-7">
      {mode === "signup" && <Stepper step={1} />}
      <div role="tablist" aria-label="Account" className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        <Link role="tab" aria-selected={mode === "signup"} href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className={`rounded-xl py-2 text-center font-extrabold ${mode === "signup" ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}>
          Create account
        </Link>
        <Link role="tab" aria-selected={mode === "login"} href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className={`rounded-xl py-2 text-center font-extrabold ${mode === "login" ? "bg-surface text-ink shadow-sm" : "text-ink-3"}`}>
          Log in
        </Link>
      </div>

      {notice && <p className="mb-4 rounded-xl bg-yellow-soft px-3 py-2 text-sm font-bold">{notice}</p>}

      {mode === "login" && accounts.length > 0 && (
        <div className="mb-5">
          <p className="micro mb-2 text-ink-3">Accounts on this device</p>
          <ul className="flex flex-col gap-1.5">
            {accounts.map((a) => (
              <li key={a.email} className="flex items-center gap-2">
                <button type="button" onClick={() => setEmail(a.email)} className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 text-left ${email === a.email ? "border-blue bg-blue-soft" : "border-line hover:bg-surface-2"}`}>
                  <Avatar name={a.username} colour={a.avatarColour} size={30} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold">{a.username}</span>
                    <span className="block truncate text-xs text-ink-3">{a.email}</span>
                  </span>
                </button>
                <button type="button" className="icon-btn !h-9 !w-9" aria-label={`Remove ${a.username} from this device`} onClick={() => forgetDeviceAccount(a.email)}>
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={action} className="flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={state?.field === "email"} />
        </label>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <span className="relative block">
            <input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              className="field pr-12"
              aria-invalid={state?.field === "password"}
              aria-describedby={mode === "signup" ? "pw-hint" : undefined}
            />
            <button type="button" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 hover:text-blue-ink" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
          {mode === "signup" && (
            <span id="pw-hint" className="mt-1 block text-xs text-ink-3">
              At least 8 characters.
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-ink-2">
            <input type="checkbox" name="keep" defaultChecked className="h-4 w-4 accent-[var(--blue)]" />
            Keep me logged in
          </label>
          {mode === "login" && (
            <Link href="/forgot" className="text-sm font-extrabold text-blue-ink">
              Forgot password?
            </Link>
          )}
        </div>
        <FormMessage state={state} />
        <Submit>{mode === "signup" ? "Create account" : "Log in"}</Submit>
      </form>

      {(GOOGLE || APPLE) && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-extrabold text-ink-3">
            <span className="h-0.5 flex-1 bg-line" />
            OR
            <span className="h-0.5 flex-1 bg-line" />
          </div>
          <div className="grid gap-2">
            {GOOGLE && (
              <form action={oauthAction}>
                <input type="hidden" name="provider" value="google" />
                {next && <input type="hidden" name="next" value={next} />}
                <button className="btn btn-secondary btn-block" type="submit">
                  <GoogleMark /> Continue with Google
                </button>
              </form>
            )}
            {APPLE && (
              <form action={oauthAction}>
                <input type="hidden" name="provider" value="apple" />
                {next && <input type="hidden" name="next" value={next} />}
                <button className="btn btn-secondary btn-block" type="submit">
                  <AppleMark /> Continue with Apple
                </button>
              </form>
            )}
          </div>
        </>
      )}

      {DEMO && mode === "login" && (
        <form action={demoLoginAction} className="mt-5 border-t-2 border-line pt-5">
          <button type="submit" className="btn btn-ghost btn-block">
            Explore with the demo student
          </button>
          <p className="mt-1 text-center text-xs text-ink-3">A sample Year 12 HSC account. Changes reset daily.</p>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-ink-3">
        By continuing you agree to our{" "}
        <Link href="/terms" className="font-bold underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-bold underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
function AppleMark() {
  return (
    <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
      <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-76 0-104 41-166 41s-106-58-156-128C44 790 0 671 0 557c0-182 118-279 235-279 62 0 114 41 153 41 37 0 95-43 166-43 27 0 124 2 188 94zM554 158c29-35 50-83 50-131 0-7-1-13-2-19-47 2-104 32-138 72-27 30-52 78-52 127 0 7 1 15 2 17 3 1 8 1 13 1 43 0 97-29 127-67z" />
    </svg>
  );
}
