import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginAsDemo } from "./helpers";

const PAGES = ["/home", "/lessons", "/tutor", "/papers", "/flashcards", "/planner", "/groups", "/progress", "/tools", "/plans", "/profile", "/settings/notifications", "/feedback"];

for (const theme of ["light", "dark"] as const) {
  test(`no serious accessibility violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await loginAsDemo(page);
    await page.evaluate((t) => localStorage.setItem("sp-theme", t), theme);
    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      for (const v of r.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
        failures.push(`${path}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")} — ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

test("signed-out pages have no serious accessibility violations", async ({ page }) => {
  const failures: string[] = [];
  for (const path of ["/login", "/signup", "/forgot", "/privacy", "/terms"]) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    for (const v of r.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) failures.push(`${path}: ${v.id} ${v.nodes[0]?.target.join(" ")}`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});
