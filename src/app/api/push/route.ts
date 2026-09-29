import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function POST(req: NextRequest) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const parsed = Sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({ user_id: v.userId, endpoint: parsed.data.endpoint, keys: parsed.data.keys });
  return error ? NextResponse.json({ error: "save failed" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const v = await getViewer();
  if (!v) return NextResponse.json({ error: "signed out" }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint === "string") {
    const supabase = await createClient();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
  return NextResponse.json({ ok: true });
}
