import { chromium } from "@playwright/test";
const [,, base, out, ...paths] = process.argv;
const browser = await chromium.launch();
for (const [name, vp] of [["d", { width: 1366, height: 900 }], ["m", { width: 390, height: 844 }]]) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const p of paths) {
      await page.goto(base + p, { waitUntil: "networkidle" });
      const safe = p.replace(/[^a-z0-9]+/gi, "_") || "home";
      await page.screenshot({ path: `${out}/${safe}-${name}-${scheme}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
console.log("ok");
