import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { InviteForm } from "./InviteForm";
import { Stepper } from "../../Stepper";
import { signOutAction } from "../../actions";

export const metadata: Metadata = { title: "Beta invite code" };

export default async function InvitePage({ searchParams }: PageProps<"/signup/invite">) {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.emailConfirmed) redirect("/signup/verify");
  if (v.isBeta) redirect(v.profile.onboarded_at ? "/home" : "/signup/profile");
  const removed = (await searchParams).removed === "1" || Boolean(v.profile.beta_removed_at);
  return (
    <div className="card card-pad sm:p-7">
      <Stepper step={3} />
      <span className="beta-tag">PRIVATE BETA</span>
      <h1 className="mt-2 text-2xl font-extrabold">Enter your invite code</h1>
      {removed ? (
        <p role="alert" className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-sm font-bold text-warn-ink">
          Your beta access was removed. If you think this is a mistake, contact the StudyPilot team. You can enter a new invite code below.
        </p>
      ) : (
        <p className="mt-1 text-ink-2">StudyPilot is invite-only while we test it. Beta testers get every feature free.</p>
      )}
      <InviteForm />
      <form action={signOutAction} className="mt-4 text-center">
        <button className="text-sm font-bold text-ink-3 underline" type="submit">
          Log out ({v.email})
        </button>
      </form>
    </div>
  );
}
