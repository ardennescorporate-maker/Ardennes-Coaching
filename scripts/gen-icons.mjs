// Renders Pip's face tile to PNG app icons. Needs `pnpm dev` running on :3000.
import { chromium } from "@playwright/test";
const out = new URL("../public/icons/", import.meta.url).pathname;
const app = new URL("../src/app/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
const shot = async (q, file) => {
  await page.goto(`http://localhost:3000/pip-render?${q}`);
  await page.waitForTimeout(300);
  await page.locator("#tile").screenshot({ path: file, omitBackground: true });
};
await shot("size=192", `${out}icon-192.png`);
await shot("size=512", `${out}icon-512.png`);
await shot("size=512&maskable=1", `${out}maskable-512.png`);
await shot("size=180&round=0", `${app}apple-icon.png`);
await shot("size=64", `${app}icon.png`);
await browser.close();
console.log("icons written");
