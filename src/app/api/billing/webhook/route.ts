import { NextResponse, type NextRequest } from "next/server";
import { BILLING_ENABLED, handleWebhook } from "@/lib/server/billing";

export async function POST(req: NextRequest) {
  if (!BILLING_ENABLED) return NextResponse.json({ error: "billing disabled" }, { status: 404 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  try {
    await handleWebhook(await req.text(), sig);
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("stripe webhook", e);
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
