"use client";
import Link from "next/link";
import { useActionState } from "react";
import { forgotAction, type FormState } from "../actions";
import { FormMessage, Submit } from "../FormBits";

export default function ForgotPage() {
  const [state, action] = useActionState<FormState, FormData>(forgotAction, null);
  return (
    <div className="card card-pad sm:p-7">
      <h1 className="text-2xl font-extrabold">Reset your password</h1>
      <p className="mt-1 text-ink-2">Enter your email and we&apos;ll send you a 6-digit reset code.</p>
      <form action={action} className="mt-5 flex flex-col gap-4">
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" required className="field" />
        </label>
        <FormMessage state={state} />
        <Submit>Send reset code</Submit>
      </form>
      <Link href="/login" className="mt-4 block text-center text-sm font-bold text-ink-3 underline">
        Back to log in
      </Link>
    </div>
  );
}
