"use client";
import { useActionState } from "react";
import { mfaVerifyAction, signOutAction, type FormState } from "../../actions";
import { CodeInput, FormMessage, Submit } from "../../FormBits";

export default function MfaPage() {
  const [state, action] = useActionState<FormState, FormData>(mfaVerifyAction, null);
  return (
    <div className="card card-pad sm:p-7">
      <h1 className="text-2xl font-extrabold">Two-factor check</h1>
      <p className="mt-1 text-ink-2">Open your authenticator app and enter the 6-digit code for StudyPilot.</p>
      <form action={action} className="mt-5 flex flex-col gap-4">
        <CodeInput />
        <FormMessage state={state} />
        <Submit>Verify</Submit>
      </form>
      <form action={signOutAction} className="mt-4 text-center">
        <button type="submit" className="text-sm font-bold text-ink-3 underline">
          Use a different account
        </button>
      </form>
    </div>
  );
}
