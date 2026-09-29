"use client";
import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import { ProfileFields, type ProfileDefaults } from "@/components/profile/ProfileFields";
import { updateProfileAction, type SettingsState } from "../actions";
import { Msg, Save } from "./bits";

export function ProfileTab({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateProfileAction, null);
  return (
    <Card>
      <form action={action} className="flex flex-col gap-5">
        <ProfileFields defaults={defaults} errorField={state?.field} />
        <div className="flex flex-wrap items-center gap-3">
          <Save>Save profile</Save>
          <Msg state={state} />
        </div>
      </form>
    </Card>
  );
}
