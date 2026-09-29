import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { ProfileForm } from "./ProfileForm";
import { Stepper } from "../../Stepper";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function ProfileSetupPage() {
  const v = await getViewer();
  if (!v) redirect("/login");
  if (!v.isBeta) redirect("/signup/invite");
  if (v.profile.onboarded_at && v.profile.username) redirect("/home");
  const suggested = (v.email.split("@")[0] ?? "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 20);
  return (
    <div className="card card-pad sm:p-7">
      <Stepper step={4} />
      <h1 className="text-2xl font-extrabold">Set up your profile</h1>
      <p className="mt-1 text-ink-2">Other students only ever see your username, avatar, level, badges and streak.</p>
      <ProfileForm suggested={suggested.length >= 3 ? suggested : ""} />
    </div>
  );
}
