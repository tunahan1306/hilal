import { chromium } from "@playwright/test";
const b = await chromium.launch(); const p = await b.newPage();
p.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)));
p.on("requestfailed", (r) => console.log("failed:", r.url().slice(0, 120), r.failure()?.errorText));
await p.goto(process.argv[2], { waitUntil: "networkidle" });
console.log("title:", await p.title(), "h1:", await p.locator("h1").first().textContent().catch(() => null));
await b.close();
