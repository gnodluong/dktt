// Chụp ảnh các màn hình ở hai chế độ màu và hai khổ màn hình.
// Chạy: node scripts/shots.mjs [tên-màn-hình ...]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const EDGE =
  process.env.BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const targets = [
  { name: "home", path: "/" },
  { name: "register", path: "/dang-ky" },
  { name: "urgent", path: "/dang-ky/dot-xuat" },
  { name: "lookup", path: "/tra-cuu" },
  { name: "login", path: "/chi-huy/login" },
];

const only = process.argv.slice(2);
const picked = only.length ? targets.filter((t) => only.includes(t.name)) : targets;

const sizes = [
  { tag: "desktop", width: 1440, height: 1100 },
  { tag: "mobile", width: 390, height: 844 },
];

mkdirSync(".impeccable/review", { recursive: true });

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

for (const scheme of ["light", "dark"]) {
  for (const size of sizes) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      colorScheme: scheme,
      deviceScaleFactor: 1,
      locale: "vi-VN",
    });
    const page = await ctx.newPage();
    for (const t of picked) {
      await page.goto(BASE + t.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      await page.screenshot({
        path: `.impeccable/review/${t.name}-${scheme}-${size.tag}.png`,
        fullPage: true,
      });
      console.log(`${t.name}-${scheme}-${size.tag}.png`);
    }
    await ctx.close();
  }
}

await browser.close();
