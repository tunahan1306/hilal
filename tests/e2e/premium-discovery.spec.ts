import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test.describe("server age confirmation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("acceptance, refresh and navigation retain declaration", async ({ page, context, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/sehir/istanbul/kadikoy");
    expect(await response!.text()).not.toContain("/demo/");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect((await request.get("/api/discovery" )).status()).toBe(403);
    expect((await request.get("/api/image?src=%2Fdemo%2Fportrait-1.webp&w=640")).status()).toBe(403);
    expect((await request.get("/demo/portrait-1.webp")).status()).toBe(403);
    expect((await request.get("/_next/image?url=%2Fdemo%2Fportrait-1.webp&w=640&q=75")).status()).toBe(403);
    await page.getByRole("button", { name: "Evet, 18 yaşından büyüğüm" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kadıköy");
    const cookie = (await context.cookies()).find((c) => c.name === "hilal_adult")!;
    expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe("Lax"); expect(cookie.expires).toBeGreaterThan(Date.now() / 1000);
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Keşfet", exact: true }).first().click();
    await expect(page).toHaveURL(/\/kesfet$/);
    await expect(page.locator("article").first()).toBeVisible();
  });
  test("decline never exposes profiles; gate supports keyboard and screen readers", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Evet, 18 yaşından büyüğüm" })).toBeFocused();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole("button", { name: "Hayır, 18 yaşından küçüğüm" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bu içerik yetişkinlere özeldir.");
    await expect(page.locator("img, article")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("img, article")).toHaveCount(0);
    await page.goto("/profil/ece-tu");
    await expect(page.getByRole("button", { name: "Evet, 18 yaşından büyüğüm" })).toBeVisible();
  });
});

test("progressive discovery retries errors and appends unique results", async ({ page, request }) => {
  expect((await request.get("/api/discovery?il=izmir&ilce=kadikoy")).status()).toBe(400);
  expect((await request.get("/api/discovery?cursor=bad")).status()).toBe(400);
  expect((await request.get("/api/image?src=https%3A%2F%2Fexample.com%2Fx.webp&w=640")).status()).toBe(400);
  await page.goto("/kesfet");
  const cards = page.locator("article h3 a");
  const initial = await cards.count();
  await expect(page.getByRole("button", { name: "Daha fazla göster" })).toBeVisible();
  await page.route("**/api/discovery?*", (route) => route.fulfill({ status: 503, json: { error: "test" } }), { times: 1 });
  await page.getByRole("button", { name: "Daha fazla göster" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Profiller yüklenemedi" })).toBeVisible();
  await page.getByRole("button", { name: "Tekrar dene" }).click();
  await expect.poll(() => cards.count()).toBeGreaterThan(initial);
  const links = await cards.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  expect(new Set(links).size).toBe(links.length);
});

test("responsive themes, photographs, canonical links and screenshots", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir("artifacts/premium-discovery", { recursive: true });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/sehir/istanbul/kadikoy"]) {
      await page.goto(path);
      await expect(page.locator("article").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator("article h3 a").first().click();
    await expect(page.getByRole("button", { name: "Şikâyet et" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto("/");
  await expect.poll(() => page.locator("article img").first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: "artifacts/premium-discovery/homepage.png", fullPage: true });
  await page.goto("/sehir/istanbul/kadikoy");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/sehir\/istanbul\/kadikoy$/);
  await page.screenshot({ path: "artifacts/premium-discovery/district.png", fullPage: true });
  await page.locator("article h3 a").first().click();
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("load");
  await expect(page.getByRole("button", { name: "Şikâyet et" })).toBeVisible();
  await page.screenshot({ path: "artifacts/premium-discovery/profile.png", fullPage: true });
  for (const theme of ["light", "dark"]) {
    await page.getByRole("button", { name: "Tema seçimi" }).click();
    await page.getByRole("menuitemradio", { name: theme === "light" ? "Açık" : "Koyu", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(page.getByRole("menu", { includeHidden: true })).toHaveCount(0);
    await expect(page.locator("main")).not.toHaveAttribute("aria-hidden", "true");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  }
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "artifacts/premium-discovery/age-gate.png", fullPage: true });
  expect(errors).toEqual([]);
});
