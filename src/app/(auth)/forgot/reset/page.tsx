"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "../../actions";
import { CodeInput, FormMessage, Submit } from "../../FormBits";

export default function ResetPage() {
  const [state, action] = useActionState<FormState, FormData>(resetPasswordAction, null);
  return (
    <div className="card card-pad sm:p-7">
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      <p className="mt-1 text-ink-2">If an account exists for that email, we&apos;ve sent a 6-digit code.</p>
      <form action={action} className="mt-5 flex flex-col gap-4">
        <CodeInput invalid={state?.field === "code"} />
        <label className="block">
          <span className="label">New password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={8} required className="field" aria-invalid={state?.field === "password"} />
          <span className="mt-1 block text-xs text-ink-3">At least 8 characters.</span>
        </label>
        <FormMessage state={state} />
        <Submit>Save new password</Submit>
      </form>
      <Link href="/forgot" className="mt-4 block text-center text-sm font-bold text-ink-3 underline">
        Send a new code
      </Link>
    </div>
  );
}
