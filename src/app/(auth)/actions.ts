"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { SESSION_ONLY_COOKIE } from "@/lib/supabase/env";
import { allow } from "@/lib/server/ratelimit";
import { clientIp } from "@/lib/request";
import { recordLogin } from "@/lib/server/login-history";
import { getViewer, nextOnboardingStep } from "@/lib/viewer";
import { COUNTRIES, SUBJECTS, YEAR_LEVELS, AVATAR_COLOURS, type Country } from "@/lib/domain/catalog";
import { validateUsername } from "@/lib/domain/codes";

export type FormState = { error?: string; ok?: string; field?: string } | null;

const PENDING_EMAIL = "sp-pending-email";
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const emailSchema = z.string().trim().toLowerCase().email();

function safeNext(next: FormDataEntryValue | null): string | null {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

async function setKeepLoggedIn(keep: boolean) {
  const store = await cookies();
  if (keep) store.delete(SESSION_ONLY_COOKIE);
  else store.set(SESSION_ONLY_COOKIE, "1", { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
}

// ─── Sign up ────────────────────────────────────────────────────────────────
export async function signUpAction(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success) return { error: "Enter a valid email address.", field: "email" };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", field: "password" };
  if (password.length > 72) return { error: "Passwords can be at most 72 characters.", field: "password" };
  const ip = await clientIp();
  if (!(await allow(`signup:${ip}`, 10, 3600))) return { error: "Too many sign-ups from this network. Try again in an hour." };

  await setKeepLoggedIn(form.get("keep") === "on");
  const supabase = await createClient({ sessionOnly: form.get("keep") !== "on" });
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { emailRedirectTo: `${site()}/auth/callback` },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { error: "That email already has an account. Try logging in instead.", field: "email" };
    if (/password/i.test(error.message)) return { error: "That password is too weak. Try a longer one with a mix of words and numbers.", field: "password" };
    console.error("signup", error.message);
    return { error: "We couldn't create your account right now. Please try again in a minute." };
  }
  // Supabase returns a user with no identities when the email is already registered (anti-enumeration).
  if (data.user && data.user.identities?.length === 0) return { error: "That email already has an account. Try logging in instead.", field: "email" };

  (await cookies()).set(PENDING_EMAIL, email.data, { path: "/", maxAge: 3600, httpOnly: true, sameSite: "lax" });
  if (data.session) redirect("/signup/invite"); // email confirmation disabled in this environment
  redirect("/signup/verify");
}

export async function verifyEmailAction(_: FormState, form: FormData): Promise<FormState> {
  const store = await cookies();
  const email = store.get(PENDING_EMAIL)?.value;
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!email) return { error: "Your sign-up expired. Start again from Create account." };
  if (token.length !== 6) return { error: "Enter the 6-digit code from your email.", field: "code" };
  if (!(await allow(`otp:${email}`, 10, 600))) return { error: "Too many tries. Wait 10 minutes, then request a new code." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { error: "That code didn't work. Check the latest email or send a new code.", field: "code" };
  store.delete(PENDING_EMAIL);
  await recordLogin(data.user.id, "Email (new account)");
  redirect("/signup/invite");
}

export async function resendCodeAction(): Promise<FormState> {
  const email = (await cookies()).get(PENDING_EMAIL)?.value;
  if (!email) return { error: "Your sign-up expired. Start again from Create account." };
  if (!(await allow(`resend:${email}`, 3, 600))) return { error: "We've sent a few codes already. Wait a few minutes and check your spam folder." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: "We couldn't send a new code right now. Try again in a minute." };
  return { ok: "New code sent. Check your inbox." };
}

// ─── Log in ─────────────────────────────────────────────────────────────────
export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email.success) return { error: "Enter a valid email address.", field: "email" };
  if (!password) return { error: "Enter your password.", field: "password" };
  const ip = await clientIp();
  if (!(await allow(`login:ip:${ip}`, 30, 600)) || !(await allow(`login:email:${email.data}`, 8, 600)))
    return { error: "Too many login attempts. Wait 10 minutes and try again, or reset your password." };

  const keep = form.get("keep") === "on";
  await setKeepLoggedIn(keep);
  const supabase = await createClient({ sessionOnly: !keep });
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) {
      (await cookies()).set(PENDING_EMAIL, email.data, { path: "/", maxAge: 3600, httpOnly: true, sameSite: "lax" });
      await supabase.auth.resend({ type: "signup", email: email.data });
      redirect("/signup/verify");
    }
    return { error: "That email and password don't match. Check them, or reset your password." };
  }
  await recordLogin(data.user.id, "Email and password");
  const viewer = await getViewer();
  const step = viewer ? await nextOnboardingStep(viewer) : "/login";
  redirect(step ?? safeNext(form.get("next")) ?? "/home");
}

export async function oauthAction(form: FormData) {
  const provider = form.get("provider");
  if (provider !== "google" && provider !== "apple") return;
  const keep = form.get("keep") !== "off";
  await setKeepLoggedIn(keep);
  const supabase = await createClient({ sessionOnly: !keep });
  const next = safeNext(form.get("next")) ?? "/home";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${site()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

// ─── Password reset ─────────────────────────────────────────────────────────
export async function forgotAction(_: FormState, form: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address.", field: "email" };
  const ip = await clientIp();
  if (!(await allow(`reset:ip:${ip}`, 5, 900)) || !(await allow(`reset:${email.data}`, 3, 900)))
    return { error: "Too many reset requests. Wait 15 minutes and try again." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${site()}/forgot/reset` });
  // Same answer whether or not the account exists.
  (await cookies()).set(PENDING_EMAIL, email.data, { path: "/", maxAge: 3600, httpOnly: true, sameSite: "lax" });
  redirect("/forgot/reset");
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const store = await cookies();
  const email = store.get(PENDING_EMAIL)?.value;
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  const password = String(form.get("password") ?? "");
  if (!email) return { error: "This reset expired. Request a new code." };
  if (token.length !== 6) return { error: "Enter the 6-digit code from your email.", field: "code" };
  if (password.length < 8) return { error: "Use at least 8 characters for your new password.", field: "password" };
  if (!(await allow(`otp:${email}`, 10, 600))) return { error: "Too many tries. Wait 10 minutes, then request a new code." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data.user) return { error: "That code didn't work. Check the latest email or request a new one.", field: "code" };
  const { error: upErr } = await supabase.auth.updateUser({ password });
  if (upErr) return { error: "We couldn't save that password. Try a different one." };
  store.delete(PENDING_EMAIL);
  await recordLogin(data.user.id, "Password reset");
  redirect("/home");
}

// ─── Two-factor (login challenge) ───────────────────────────────────────────
export async function mfaVerifyAction(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from your authenticator app." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await allow(`mfa:${user.id}`, 8, 600))) return { error: "Too many tries. Wait 10 minutes and try again." };
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.[0];
  if (!factor) redirect("/home");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "That code didn't match. Codes change every 30 seconds, so try the newest one." };
  await recordLogin(user.id, "Two-factor code");
  redirect("/home");
}

// ─── Beta invite code ───────────────────────────────────────────────────────
const INVITE_ERRORS: Record<string, string> = {
  invalid: "That invite code is not valid. Check it and try again.",
  disabled: "This invite code has been disabled.",
  used_up: "This invite code has already been used the maximum number of times.",
  locked: "Too many wrong codes. Wait a few minutes and try again.",
  not_signed_in: "Please log in again.",
};

export async function redeemInviteAction(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "").trim();
  if (!code) return { error: "Enter your invite code." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_beta_code", { p_code: code });
  if (error) {
    console.error("redeem", error.message);
    return { error: "We couldn't check that code right now. Try again in a minute." };
  }
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) return { error: INVITE_ERRORS[res.error ?? "invalid"] ?? INVITE_ERRORS.invalid };
  redirect("/signup/profile");
}

// ─── Profile setup ──────────────────────────────────────────────────────────
export async function saveProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isBeta) redirect("/signup/invite");

  const username = String(form.get("username") ?? "").trim();
  const uErr = validateUsername(username);
  if (uErr) return { error: uErr, field: "username" };
  const colour = String(form.get("avatar") ?? "");
  const year = String(form.get("year") ?? "");
  const country = String(form.get("country") ?? "") as Country;
  const system = String(form.get("system") ?? "");
  const subjects = form.getAll("subjects").map(String).filter((s) => (SUBJECTS as readonly string[]).includes(s));
  const goal = String(form.get("goal") ?? "").trim().slice(0, 120);

  if (!(AVATAR_COLOURS as readonly string[]).includes(colour)) return { error: "Pick an avatar colour.", field: "avatar" };
  if (!(YEAR_LEVELS as readonly string[]).includes(year)) return { error: "Choose your year level.", field: "year" };
  if (!(country in COUNTRIES)) return { error: "Choose your country.", field: "country" };
  if (!(COUNTRIES[country] as readonly string[]).includes(system)) return { error: "Choose your education system.", field: "system" };
  if (subjects.length === 0) return { error: "Pick at least one subject.", field: "subjects" };

  const { error } = await adminClient()
    .from("profiles")
    .update({ username, avatar_colour: colour, year_level: year, country, system, subjects, goal: goal || null, onboarded_at: viewer.profile.onboarded_at ?? new Date().toISOString() })
    .eq("id", viewer.userId);
  if (error) {
    if (error.code === "23505") return { error: "That username is taken. Try another.", field: "username" };
    console.error("profile save", error.message);
    return { error: "We couldn't save your profile. Try again in a minute." };
  }
  redirect("/home");
}

export async function checkUsernameAction(username: string): Promise<string | null> {
  const err = validateUsername(username);
  if (err) return err;
  const viewer = await getViewer();
  if (!viewer) return null;
  const { data } = await adminClient().from("profiles").select("id").ilike("username", username.replace(/[_%\\]/g, "\\$&")).neq("id", viewer.userId).maybeSingle();
  return data ? "That username is taken. Try another." : null;
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
