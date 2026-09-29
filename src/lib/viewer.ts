import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Lang } from "@/lib/domain/catalog";
import { dayKey } from "@/lib/domain/dates";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  avatar_colour: string;
  avatar_url: string | null;
  year_level: string | null;
  country: string | null;
  system: string | null;
  subjects: string[];
  goal: string | null;
  theme: "system" | "light" | "dark";
  language: Lang;
  timezone: string;
  xp: number;
  streak: number;
  last_study_date: string | null;
  study_minutes: number;
  questions_answered: number;
  questions_correct: number;
  papers_completed: number;
  role: "student" | "admin";
  plan: "free" | "premium" | "premium_exam";
  beta_code_id: string | null;
  beta_joined_at: string | null;
  beta_removed_at: string | null;
  is_demo: boolean;
  launch_plan: string | null;
  onboarded_at: string | null;
  privacy: { publicProfile: boolean; showOnLeaderboards: boolean; activity: "everyone" | "friends" | "me"; friendRequests: "everyone" | "fof" | "nobody" };
  notif_prefs: {
    study: boolean;
    motivation: boolean;
    competition: boolean;
    ai: boolean;
    frequency: "low" | "normal" | "high";
    reminderTime: string;
    quietStart: string;
    quietEnd: string;
    inApp: boolean;
    push: boolean;
    email: boolean;
  };
  plan_hours: Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", number>;
  created_at: string;
};

export type Viewer = {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  provider: string;
  profile: Profile;
  today: string;
  isAdmin: boolean;
  isBeta: boolean;
};

/** Current user + profile, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    provider: (user.app_metadata?.provider as string) ?? "email",
    profile,
    today: dayKey(new Date(), profile.timezone),
    isAdmin: profile.role === "admin",
    isBeta: Boolean(profile.beta_joined_at && !profile.beta_removed_at),
  };
});

/** Where a signed-in user must go next before they can use the app (null = all set). */
export async function nextOnboardingStep(v: Viewer): Promise<string | null> {
  if (!v.emailConfirmed) return "/signup/verify";
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") return "/login/mfa";
  if (!v.isBeta) return v.profile.beta_removed_at ? "/signup/invite?removed=1" : "/signup/invite";
  if (!v.profile.onboarded_at || !v.profile.username) return "/signup/profile";
  return null;
}

/** For app pages: returns a fully onboarded viewer or redirects. */
export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect("/login");
  const step = await nextOnboardingStep(v);
  if (step) redirect(step);
  return v;
}

export async function requireAdmin(): Promise<Viewer> {
  const v = await requireViewer();
  if (!v.isAdmin) redirect("/home");
  return v;
}
