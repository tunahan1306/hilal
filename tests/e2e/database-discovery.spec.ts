import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test.skip(!process.env.E2E_SUPABASE, "Requires database deployment");

test("database discovery, canonical location and responsive empty states", async ({ page, request }) => {
  await mkdir("artifacts/production", { recursive: true });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/sehir/istanbul/atasehir"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/sehir\/istanbul\/atasehir$/);
  await page.screenshot({ path: "artifacts/production/district.png", fullPage: true });
  await page.goto("/");
  await page.screenshot({ path: "artifacts/production/homepage.png", fullPage: true });
  expect((await request.get("/sehir/izmir/atasehir")).status()).toBe(404);
  expect((await request.get("/api/discovery?il=izmir&ilce=atasehir")).status()).toBe(400);
  expect((await request.get("/api/discovery?il=istanbul&ilce=atasehir")).status()).toBe(200);
});

test.describe("database age declaration", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("accept, refresh and navigation preserve declaration", async ({ page, context }) => {
    await page.goto("/sehir/istanbul/atasehir");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({ path: "artifacts/production/age-gate.png", fullPage: true });
    await page.getByRole("button", { name: "Evet, 18 yaşından büyüğüm" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ataşehir");
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Keşfet", exact: true }).first().click();
    await expect(page).toHaveURL(/\/kesfet$/);
    expect((await context.cookies()).find(c => c.name === "hilal_adult")?.httpOnly).toBe(true);
  });
});
