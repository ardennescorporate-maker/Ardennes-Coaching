"use client";
import { useActionState } from "react";
import { saveProfileAction, type FormState } from "../../actions";
import { FormMessage, Submit } from "../../FormBits";
import { ProfileFields } from "@/components/profile/ProfileFields";

export function ProfileForm({ suggested }: { suggested: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveProfileAction, null);
  return (
    <form action={action} className="mt-5 flex flex-col gap-5">
      <ProfileFields defaults={{ username: suggested }} errorField={state?.field} />
      <FormMessage state={state} />
      <Submit variant="gold">Start studying</Submit>
    </form>
  );
}
