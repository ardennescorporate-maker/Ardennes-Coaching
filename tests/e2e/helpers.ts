import fs from "node:fs";
import type { Page } from "@playwright/test";

/** Latest 6-digit code emailed to `email` (dev mail sink log). */
export function latestCode(email: string): string {
  const log = fs.readFileSync(".dev-supabase/mail.log", "utf8");
  const block = log.split("=====").filter((b) => b.includes(email)).pop();
  const m = block?.match(/>\s*(\d{6})\s*</);
  if (!m) throw new Error(`no code for ${email}`);
  return m[1];
}

export async function loginAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore with the demo student" }).click();
  await page.waitForURL("**/home", { timeout: 60_000 });
}
