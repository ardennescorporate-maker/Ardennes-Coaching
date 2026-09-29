"use client";
import { useActionState } from "react";
import { redeemInviteAction, type FormState } from "../../actions";
import { FormMessage, Submit } from "../../FormBits";

export function InviteForm() {
  const [state, action] = useActionState<FormState, FormData>(redeemInviteAction, null);
  return (
    <form action={action} className="mt-5 flex flex-col gap-4">
      <label className="block">
        <span className="label">Invite code</span>
        <input
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="PILOT-XXXX"
          className="field num text-lg uppercase tracking-widest"
          aria-invalid={Boolean(state?.error)}
        />
      </label>
      <FormMessage state={state} />
      <Submit>Unlock StudyPilot</Submit>
    </form>
  );
}
