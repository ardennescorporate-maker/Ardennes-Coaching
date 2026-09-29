import { expect, test } from "@playwright/test";
import { latestCode } from "./helpers";

test("sign up, verify email, pass the beta gate and onboard", async ({ page }) => {
  const email = `e2e${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("correct-horse-9");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/signup/verify");
  await page.getByLabel("6-digit code").fill(latestCode(email));
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.waitForURL("**/signup/invite");

  // App pages are gated until the invite code is accepted.
  await page.goto("/home");
  await expect(page).toHaveURL(/\/signup\/invite/);

  await page.getByLabel("Invite code").fill("NEWCASTLE-BETA");
  await page.getByRole("button", { name: "Unlock StudyPilot" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "disabled" })).toBeVisible();
  await page.getByLabel("Invite code").fill("pilot-2026");
  await page.getByRole("button", { name: "Unlock StudyPilot" }).click();
  await page.waitForURL("**/signup/profile");

  await page.getByLabel("Username").fill(`e2e_${String(Date.now()).slice(-6)}`);
  await page.getByText("Chemistry", { exact: true }).click();
  await page.getByRole("button", { name: "Start studying" }).click();
  await page.waitForURL("**/home");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
});

test("wrong password shows a plain error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toBeVisible();
});

test("signed-out visitors are sent to log in", async ({ page }) => {
  await page.goto("/planner");
  await expect(page).toHaveURL(/\/login\?next=%2Fplanner/);
});
