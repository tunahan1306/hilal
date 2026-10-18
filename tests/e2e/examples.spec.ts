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

test("kurgusal örnekler etiketli, iletişim bağlantısız ve doğrulanmamış olarak gösterilir", async ({ page, request }) => {
  const verified = await (await request.get("/api/discovery?dogrulanmis=1")).json();
  expect(verified.items.filter((p: { isExample?: boolean }) => p.isExample)).toEqual([]);
  await page.goto("/tr");
  await expect(page.getByRole("article").first()).toBeVisible();
  await page.goto("/tr/kesfet");
  await expect(page.getByRole("article")).toHaveCount(FIXTURES.length);
  // Kurgusal kayıt gerçek bir kişiye iletişim taşımaz; her kart görünür biçimde etiketlidir.
  await expect(page.locator(`a[href^="https://wa.me/"]`)).toHaveCount(0);
  await expect(page.getByTestId("example-badge")).toHaveCount(FIXTURES.length);
  expect(JSON.stringify(await (await request.get("/api/discovery")).json())).not.toContain(FIXTURE_WHATSAPP);
  await page.goto("/tr/konum/tr/istanbul/atasehir");
  const card = page.getByRole("article").filter({ hasText: "Ece" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Ataşehir, İstanbul");
  await card.getByRole("link", { name: "Ece", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tr/profil/${slugOf("ece")}$`));
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ece");
  await expect(page.getByText("Kimlik ve yaş doğrulaması yapılmadı.", { exact: true })).toBeVisible();
  await expect(page.getByText("Yaş belgeyle doğrulandı", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Bu kayıt kurgusal bir örnektir.", { exact: false })).toBeVisible();
  await expect(page.getByTestId("profile-example-badge")).toBeVisible();
  await expect(page.locator(`a[href="${wa}"]`)).toHaveCount(0);
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
  await page.goto("/tr/konum/tr/izmir/karsiyaka");
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
