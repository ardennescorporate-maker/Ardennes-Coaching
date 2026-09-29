"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resendCodeAction, verifyEmailAction, type FormState } from "../../actions";
import { CodeInput, FormMessage, Submit } from "../../FormBits";

export function VerifyForm() {
  const [state, action] = useActionState<FormState, FormData>(verifyEmailAction, null);
  const [resent, resend, resending] = useActionState<FormState>(resendCodeAction, null);
  return (
    <div className="mt-5 flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <CodeInput invalid={state?.field === "code"} />
        <FormMessage state={state} />
        <Submit>Verify email</Submit>
      </form>
      <form action={resend} className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-3">No email? Check spam, or</span>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={resending}>
          Send a new code
        </button>
      </form>
      <FormMessage state={resent} />
      <Link href="/signup" className="text-center text-sm font-bold text-ink-3 underline">
        Use a different email
      </Link>
    </div>
  );
}
