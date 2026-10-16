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

test("direct database visibility changes appear on the next request", async ({ page }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL), "Mutation check runs only against the local server");
  const { createClient } = await import("@supabase/supabase-js");
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const slug = "kurgu-kadin-elif-20261016";
  await page.goto("/sehir/izmir/karsiyaka");
  await expect(page.getByRole("link", { name: "Elif (Örnek)" })).toBeVisible();
  try {
    const hidden = await service.from("example_profiles").update({ visible: false }).eq("slug", slug);
    if (hidden.error) throw hidden.error;
    await page.reload();
    await expect(page.getByRole("link", { name: "Elif (Örnek)" })).toHaveCount(0);
  } finally {
    const restored = await service.from("example_profiles").update({ visible: true }).eq("slug", slug);
    if (restored.error) throw restored.error;
  }
  await page.reload();
  await expect(page.getByRole("link", { name: "Elif (Örnek)" })).toBeVisible();
});
