import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLogin } from "@/lib/server/login-history";

/** OAuth (Google/Apple) and email-link callback. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/home";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  const provider = (data.user.app_metadata?.provider as string) ?? "email";
  await recordLogin(data.user.id, provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Email link");
  return NextResponse.redirect(new URL(next, url.origin));
}
