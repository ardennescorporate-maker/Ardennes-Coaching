import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_ONLY_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL, sessionOnly, supabaseConfigured } from "./env";

const PUBLIC = ["/pip-render", "/login", "/signup", "/forgot", "/auth", "/privacy", "/terms", "/setup", "/offline"];

/** Refreshes the auth session cookie and keeps signed-out users out of the app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseConfigured) {
    const p = request.nextUrl.pathname;
    if (p === "/setup" || p.startsWith("/api")) return response;
    return NextResponse.redirect(new URL("/setup", request.url));
  }
  const short = request.cookies.get(SESSION_ONLY_COOKIE)?.value === "1";

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionOnly(options, short)));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Validates the JWT with the auth server; do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path === "/" || PUBLIC.some((p) => path === p || path.startsWith(p + "/")) || path.startsWith("/api");
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (path !== "/home") url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}
