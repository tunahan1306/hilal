import { expect, test } from "@playwright/test";
import { FIXTURE_WHATSAPP, FIXTURES, cleanupExampleFixtures, seedExampleFixtures, slugOf } from "./fixtures/example-profiles";

/**
 * Veritabanındaki örnek profillerin (example_profiles) keşif, profil ve SEO davranışı.
 * Yalnızca yerel Supabase'de, sentetik fixture verisiyle çalışır; production verisine dokunmaz.
 */
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
test.skip(!process.env.E2E_SUPABASE || !local, "Yerel Supabase ve fixture gerekir");
test.describe.configure({ mode: "serial" });

test.beforeAll(seedExampleFixtures);
test.afterAll(cleanupExampleFixtures);

const wa = `https://wa.me/${FIXTURE_WHATSAPP}`;

test("veritabanı örnek profilleri görsel ve izinli WhatsApp bağlantısıyla gösterilir", async ({ page, request }) => {
  const verified = await (await request.get("/api/discovery?dogrulanmis=1")).json();
  expect(verified.items.filter((p: { isExample?: boolean }) => p.isExample)).toEqual([]);
  await page.goto("/");
  await expect(page.getByRole("article").first()).toBeVisible();
  await page.goto("/kesfet");
  await expect(page.getByRole("article")).toHaveCount(FIXTURES.length);
  await expect(page.locator(`article a[href="${wa}"]`)).toHaveCount(FIXTURES.length);
  await page.goto("/sehir/istanbul/atasehir");
  const card = page.getByRole("article").filter({ hasText: "Ece" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Ataşehir, İstanbul");
  await card.getByRole("link", { name: "Ece", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/profil/${slugOf("ece")}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ece");
  await expect(page.getByText("Kimlik ve yaş doğrulaması yapılmadı.", { exact: true })).toBeVisible();
  await expect(page.getByText("Yaş belgeyle doğrulandı", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ece ile WhatsApp üzerinden iletişim kur (yeni sekme)" })).toHaveAttribute("href", wa);
  await expect.poll(() => page.locator("main img").first().evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("kurgu-kadin-");
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("veritabanında doğrudan yapılan görünürlük değişikliği bir sonraki istekte yansır", async ({ page }) => {
  test.skip(Boolean(process.env.E2E_BASE_URL), "Değişiklik testi yalnızca yerel sunucuda çalışır");
  const { createClient } = await import("@supabase/supabase-js");
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const slug = slugOf("elif");
  await page.goto("/sehir/izmir/karsiyaka");
  await expect(page.getByRole("link", { name: "Elif", exact: true })).toBeVisible();
  try {
    const hidden = await service.from("example_profiles").update({ visible: false }).eq("slug", slug);
    if (hidden.error) throw hidden.error;
    await page.reload();
    await expect(page.getByRole("link", { name: "Elif", exact: true })).toHaveCount(0);
  } finally {
    const restored = await service.from("example_profiles").update({ visible: true }).eq("slug", slug);
    if (restored.error) throw restored.error;
  }
  await page.reload();
  await expect(page.getByRole("link", { name: "Elif", exact: true })).toBeVisible();
});
