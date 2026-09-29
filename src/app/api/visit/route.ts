import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/viewer";
import { adminClient } from "@/lib/supabase/admin";

const FEATURES = new Set(["home", "lessons", "tutor", "papers", "flashcards", "planner", "groups", "progress", "tools", "plans", "profile", "settings", "feedback", "admin"]);

export async function POST(req: NextRequest) {
  const v = await getViewer();
  if (!v) return new NextResponse(null, { status: 204 });
  const { feature } = await req.json().catch(() => ({ feature: null }));
  if (typeof feature !== "string" || !FEATURES.has(feature)) return new NextResponse(null, { status: 204 });
  const db = adminClient();
  const { data } = await db.from("feature_visits").select("count").match({ user_id: v.userId, feature, day: v.today }).maybeSingle();
  if (data) await db.from("feature_visits").update({ count: data.count + 1 }).match({ user_id: v.userId, feature, day: v.today });
  else await db.from("feature_visits").insert({ user_id: v.userId, feature, day: v.today });
  return new NextResponse(null, { status: 204 });
}
