import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

test("demo student can start and finish a lesson", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/lessons");
  await page.getByRole("link", { name: /Start course|Continue/ }).click();
  // A fresh lesson starts at the intro; a resumed one (autosave) skips it.
  const start = page.getByRole("button", { name: /^(Let's go|Continue|Check my understanding|Check)$/ }).first();
  await start.waitFor({ timeout: 60_000 });
  if ((await start.textContent()) === "Let's go") await start.click();
  for (;;) {
    if (await page.getByRole("radiogroup").count()) break;
    const btn = page.getByRole("button", { name: /^(Continue|Check my understanding)$/ });
    const label = await btn.textContent();
    await btn.click();
    if (label?.includes("Check my understanding")) break;
  }
  for (let i = 0; i < 4; i++) {
    await page.getByRole("radio").first().click();
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Lesson complete!" })).toBeVisible({ timeout: 30_000 });
});

test("sample paper hides answers until marked @mobile", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/papers");
  await page.getByRole("button", { name: "Try the sample HSC Maths paper" }).click();
  await page.waitForURL(/\/papers\/[0-9a-f-]{36}$/);
  expect(await page.content()).not.toContain("second derivative");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Submit for marking" }).click();
  await expect(page.getByText("Marked paper")).toBeVisible({ timeout: 60_000 });
});

test("no horizontal scroll at 390px @mobile", async ({ page }) => {
  await loginAsDemo(page);
  for (const path of ["/home", "/lessons", "/tutor", "/planner", "/progress", "/groups", "/settings/account"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
