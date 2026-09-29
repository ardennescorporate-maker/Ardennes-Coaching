import { NextResponse, type NextRequest } from "next/server";
import { hourlyTick } from "@/lib/server/jobs";

export const maxDuration = 300;

/** Vercel Cron (hourly). Protected by CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const result = await hourlyTick();
  return NextResponse.json(result);
}
