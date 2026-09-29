"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { getViewer } from "@/lib/viewer";
import { allow } from "@/lib/server/ratelimit";
import { AVATAR_COLOURS, COUNTRIES, LANGUAGES, SUBJECTS, YEAR_LEVELS, type Country } from "@/lib/domain/catalog";
import { validateUsername } from "@/lib/domain/codes";

export type SettingsState = { error?: string; ok?: string; field?: string; step?: string } | null;

async function viewerOrLogin() {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}

// ─── Account ────────────────────────────────────────────────────────────────
export async function changeEmailAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const v = await viewerOrLogin();
  if (v.profile.is_demo) return { error: "The demo account can't change its email." };
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address.", field: "email" };
  if (email.data === v.email) return { error: "That's already your email." };
  if (!(await allow(`email-change:${v.userId}`, 3, 3600))) return { error: "You've asked for a few changes already. Try again in an hour." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: email.data });
  if (error) return { error: /already/i.test(error.message) ? "That email is used by another account." : "We couldn't start the change. Try again in a minute." };
  return { ok: `We sent a code to ${email.data}. Enter it below to confirm.`, step: email.data };
}

export async function confirmEmailAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const v = await viewerOrLogin();
  const email = String(form.get("email") ?? "");
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (token.length !== 6) return { error: "Enter the 6-digit code.", step: email };
  if (!(await allow(`otp:${v.userId}`, 10, 600))) return { error: "Too many tries. Wait 10 minutes.", step: email };
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email_change" });
  if (error) return { error: "That code didn't work. Check the latest email.", step: email };
  revalidatePath("/settings");
  return { ok: "Email updated." };
}

export async function changePasswordAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const v = await viewerOrLogin();
  if (v.profile.is_demo) return { error: "The demo account can't change its password." };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "Use at least 8 characters for your new password.", field: "next" };
  if (!(await allow(`pw-change:${v.userId}`, 5, 900))) return { error: "Too many attempts. Wait 15 minutes." };
  // Check the current password with a throwaway client so the user's session is untouched.
  const probe = createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: bad } = await probe.auth.signInWithPassword({ email: v.email, password: current });
  if (bad) return { error: "Your current password isn't right.", field: "current" };
  await probe.auth.signOut();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "We couldn't save that password. Try a different one.", field: "next" };
  return { ok: "Password changed." };
}

export async function deleteAccountAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const v = await viewerOrLogin();
  if (v.profile.is_demo) return { error: "The demo account can't be deleted." };
  if (String(form.get("confirm") ?? "") !== "DELETE") return { error: "Type DELETE in capitals to confirm." };
  const db = adminClient();
  // Remove private uploads, then the auth user (profile and all study data cascade).
  const { data: files } = await db.storage.from("evidence").list(v.userId, { limit: 1000 });
  if (files?.length) await db.storage.from("evidence").remove(files.map((f) => `${v.userId}/${f.name}`));
  const { error } = await db.auth.admin.deleteUser(v.userId);
  if (error) return { error: "We couldn't delete your account right now. Try again, or contact us." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─── Profile ────────────────────────────────────────────────────────────────
export async function updateProfileAction(_: SettingsState, form: FormData): Promise<SettingsState> {
  const v = await viewerOrLogin();
  const username = String(form.get("username") ?? "").trim();
  const uErr = validateUsername(username);
  if (uErr) return { error: uErr, field: "username" };
  const avatar = String(form.get("avatar") ?? "");
  const year = String(form.get("year") ?? "");
  const country = String(form.get("country") ?? "") as Country;
  const system = String(form.get("system") ?? "");
  const subjects = form.getAll("subjects").map(String).filter((s) => (SUBJECTS as readonly string[]).includes(s));
  const goal = String(form.get("goal") ?? "").trim().slice(0, 120);
  if (!(AVATAR_COLOURS as readonly string[]).includes(avatar)) return { error: "Pick an avatar colour." };
  if (!(YEAR_LEVELS as readonly string[]).includes(year)) return { error: "Choose your year level." };
  if (!(country in COUNTRIES) || !(COUNTRIES[country] as readonly string[]).includes(system)) return { error: "Choose your country and system." };
  if (!subjects.length) return { error: "Pick at least one subject.", field: "subjects" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username, avatar_colour: avatar, year_level: year, country, system, subjects, goal: goal || null })
    .eq("id", v.userId);
  if (error) return { error: error.code === "23505" ? "That username is taken. Try another." : "We couldn't save your profile.", field: error.code === "23505" ? "username" : undefined };
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

// ─── Preferences ────────────────────────────────────────────────────────────
export async function updatePreferencesAction(theme: string, language: string): Promise<SettingsState> {
  const v = await viewerOrLogin();
  if (!["system", "light", "dark"].includes(theme) || !LANGUAGES.some((l) => l.code === language)) return { error: "Unknown option." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ theme, language }).eq("id", v.userId);
  if (error) return { error: "Couldn't save preferences." };
  revalidatePath("/", "layout");
  return { ok: "Preferences saved." };
}

const NotifSchema = z.object({
  study: z.boolean(),
  motivation: z.boolean(),
  competition: z.boolean(),
  ai: z.boolean(),
  frequency: z.enum(["low", "normal", "high"]),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/),
  quietStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietEnd: z.string().regex(/^\d{2}:\d{2}$/),
  inApp: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});
export async function updateNotificationPrefsAction(prefs: unknown): Promise<SettingsState> {
  const v = await viewerOrLogin();
  const parsed = NotifSchema.safeParse(prefs);
  if (!parsed.success) return { error: "Some settings weren't valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ notif_prefs: parsed.data }).eq("id", v.userId);
  return error ? { error: "Couldn't save notification settings." } : { ok: "Saved." };
}

const PrivacySchema = z.object({
  publicProfile: z.boolean(),
  showOnLeaderboards: z.boolean(),
  activity: z.enum(["everyone", "friends", "me"]),
  friendRequests: z.enum(["everyone", "fof", "nobody"]),
});
export async function updatePrivacyAction(privacy: unknown): Promise<SettingsState> {
  const v = await viewerOrLogin();
  const parsed = PrivacySchema.safeParse(privacy);
  if (!parsed.success) return { error: "Some settings weren't valid." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ privacy: parsed.data }).eq("id", v.userId);
  return error ? { error: "Couldn't save privacy settings." } : { ok: "Saved." };
}
