// Görsel QA: belirtilen sayfaların ekran görüntülerini alır (yerel geliştirme aracı).
// Kullanım: node scripts/qa-screens.mjs <çıktı-klasörü> <genişlik[xyükseklik]> [light|dark] [--full] yol1 yol2 ...
import { chromium } from "@playwright/test";
const [, , out, vp, scheme = "light", ...rest] = process.argv;
const full = rest.includes("--full");
const paths = rest.filter((p) => p !== "--full");
const [w, h = 900] = vp.split("x").map(Number);
const base = process.env.QA_BASE ?? "http://localhost:3217";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
const p = await ctx.newPage();
if (process.env.QA_LOGIN) {
  // Yalnızca demo modu: README'deki yerel demo bilgileri
  const { TOTP, Secret } = await import("otpauth");
  await p.goto(base + "/admin/giris");
  await p.getByLabel("E-posta").fill("admin@demo.local");
  await p.getByLabel("Şifre").fill(process.env.DEMO_ADMIN_PASSWORD ?? "demo-admin-2026!");
  await p.getByLabel("Doğrulama kodu (TOTP)").fill(new TOTP({ secret: Secret.fromBase32(process.env.DEMO_ADMIN_TOTP_SECRET ?? "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP") }).generate());
  await p.getByRole("button", { name: "Giriş yap" }).click();
  await p.waitForURL(/\/admin$/);
}
for (const path of paths) {
  await p.goto(base + path, { waitUntil: "networkidle" });
  await p.evaluate(async () => { await document.fonts.ready; });
  const name = `${path.replace(/[^a-z0-9]+/gi, "_") || "home"}-${w}-${scheme}${full ? "-full" : ""}.png`;
  await p.screenshot({ path: `${out}/${name}`, fullPage: full });
  console.log(name);
}
await b.close();
