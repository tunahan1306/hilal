import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_SUPABASE, "Requires explicitly published database examples");

test("examples appear in standard discovery and remain clearly fictional", async ({ page, request }) => {
  const verified = await (await request.get("/api/discovery?dogrulanmis=1")).json();
  expect(verified.items.filter((p: { isExample?: boolean }) => p.isExample)).toEqual([]);
  await page.goto("/");
  await expect(page.locator("article").filter({ hasText: "Örnek profil" })).toHaveCount(8);
  await page.goto("/kesfet");
  await expect(page.locator("article").filter({ hasText: "Örnek profil" })).toHaveCount(10);
  await page.goto("/sehir/istanbul/atasehir");
  const card = page.getByRole("article").filter({ hasText: "Ece (Örnek)" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Ataşehir, İstanbul");
  await card.getByRole("link", { name: "Ece (Örnek)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ece (Örnek)");
  await expect(page.getByText("Kurgusal örnek profil. Gerçek bir kişiyi temsil etmez;", { exact: false })).toBeVisible();
  await expect(page.getByText("Yaş belgeyle doğrulandı", { exact: false })).toHaveCount(0);
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect((await (await request.get("/sitemap.xml")).text())).not.toContain("kurgu-kadin-");
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "artifacts/production/example-profile.png", fullPage: true });
});
