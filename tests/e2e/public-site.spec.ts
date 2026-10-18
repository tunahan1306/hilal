import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { login, pick } from "./helpers";

/** Kaldırılan profil: içerik gösterilmez, sayfa noindex'tir (akış sonrası 404 "soft 404" olabilir). */
async function expectRemoved(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("button", { name: "Şikâyet et" })).toHaveCount(0);
}

test.describe("şehir ve ilçe filtreleri", () => {
  test("keşfet filtreleri URL ile senkronize çalışır", async ({ page }) => {
    await page.goto("/tr/kesfet");
    await expect(page.getByText(/profil bulundu/)).toBeVisible();
    await pick(page, "İl / bölge", "İstanbul");
    await expect(page).toHaveURL(/il=istanbul/);
    await pick(page, "İlçe / şehir", "Kadıköy");
    await expect(page).toHaveURL(/il=istanbul&ilce=kadikoy/);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.getByTestId("card-location").allTextContents()) expect(text).toContain("Kadıköy");
    await page.getByRole("switch", { name: "Doğrulanmış" }).click();
    await expect(page).toHaveURL(/dogrulanmis=1/);
    await page.reload();
    await expect(page.getByRole("switch", { name: "Doğrulanmış" })).toBeChecked();
  });

  test("ilgi alanı arayüzü kaldırıldı, eski bağlantılar kullanılabilir", async ({ page }) => {
    await page.goto("/tr/kesfet?ilgi=yoga");
    await expect(page.getByRole("button", { name: "Yoga" })).toHaveCount(0);
    await expect(page.locator("article").first()).toBeVisible();
  });

  test("il ve ilçe sayfaları doğru profilleri gösterir", async ({ page }) => {
    await page.goto("/tr/konum/tr/istanbul/kadikoy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kadıköy");
    await page.goto("/tr/konum/tr/ankara");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ankara");
    await expect(page.getByRole("link", { name: /Çankaya/ }).first()).toBeVisible();
  });

  test("geçersiz il/ilçe 404 döner", async ({ page }) => {
    expect((await page.goto("/tr/konum/tr/olmayan-il"))?.status()).toBe(404);
    expect((await page.goto("/tr/konum/tr/izmir/kadikoy"))?.status()).toBe(404);
    // Ülke ile bölge uyuşmazsa da 404 (İstanbul Almanya altında değildir)
    expect((await page.goto("/tr/konum/de/istanbul"))?.status()).toBe(404);
  });

  test("şehir seçici il sayfasına götürür", async ({ page }) => {
    await page.goto("/tr");
    await page.getByRole("combobox").first().click();
    await page.getByLabel("Şehir ara").fill("eskişe");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tr\/konum\/tr\/eskisehir$/);
  });
});

test.describe("SEO", () => {
  test("profil sayfası metadata, canonical, OG ve JSON-LD içerir", async ({ page }) => {
    // Arama motorları sayfayı doğrudan yükler: SEO işaretlemesi tam sayfa yanıtında doğrulanır.
    await page.goto("/tr/kesfet");
    const href = (await page.locator("article h3 a").first().getAttribute("href"))!;
    await page.goto(href, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const url = new URL(page.url());
    await expect(page).toHaveTitle(/ \| Hilal$/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toContain(url.pathname);
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((s) => s.includes('"ProfilePage"'))).toBe(true);
    expect(ld.some((s) => s.includes('"BreadcrumbList"'))).toBe(true);
    expect(await page.locator('meta[name="robots"]').count()).toBe(0);
  });

  test("boş il sayfası ve filtreli varyantlar noindex", async ({ page }) => {
    await page.goto("/tr/konum/tr/hakkari");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/tr/konum/tr/istanbul");
    expect(await page.locator('meta[name="robots"]').count()).toBe(0);
    await page.goto("/tr/konum/tr/istanbul?yasMin=30");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/tr\/konum\/tr\/istanbul$/);
    await page.goto("/tr/kesfet?il=ankara");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sitemap yalnızca tarayıcının indeksleyebileceği sayfaları, robots admin'i engeller", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/tr/iletisim</loc>");
    expect(sitemap).toContain("/tr/sehirler</loc>");
    // Yaş kapısı arkasındaki adresler çerezsiz tarayıcıya noindex döner; sitemap'e girmez.
    expect(sitemap).not.toContain("/tr/konum/tr/");
    expect(sitemap).not.toContain("/tr/profil/");
    expect(sitemap).not.toContain("/tr/kesfet");
    expect(sitemap).not.toContain("/admin");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
  });

  test("sponsorlu profiller etiketlenir", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.locator("article").filter({ hasText: "Sponsorlu" }).first()).toBeVisible();
  });
});

test.describe("şikâyet akışı", () => {
  test("ziyaretçi şikâyeti → yönetici incelemesi → içerik kaldırma", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/tr/konum/tr/ankara");
    const card = page.locator("article").first();
    const name = (await card.locator("h3 a").textContent())!.trim();
    await card.locator("h3 a").click();
    await expect(page).toHaveURL(/\/profil\//);
    const profileUrl = page.url();

    await page.getByRole("button", { name: "Şikâyet et" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Sahte profil").click();
    await dialog.getByLabel("Açıklama").fill("E2E: bu profil başka bir kişinin fotoğrafını kullanıyor olabilir.");
    await dialog.getByRole("button", { name: "Bildirimi gönder" }).click();
    await expect(dialog.getByRole("status")).toContainText("Bildiriminiz alındı");

    await login(page);
    await page.goto("/admin/sikayetler");
    await page.getByTestId("report-row").filter({ hasText: name }).filter({ hasText: "Açık" }).first().getByRole("link").click();
    await page.getByRole("button", { name: "İncelemeye al" }).click();
    await expect(page.getByTestId("moderation-history")).toContainText("İncelemeye alındı");
    await page.getByRole("button", { name: "İçeriği kaldır" }).click();
    await page.getByRole("dialog").getByRole("textbox").fill("E2E: şikâyet doğrulandı.");
    await page.getByRole("dialog").getByRole("button", { name: "Kaldır" }).click();
    await expect(page.getByTestId("moderation-history")).toContainText("İçerik kaldırıldı");
    await expect(page.getByText("Kaldırıldı", { exact: true }).first()).toBeVisible();

    await expectRemoved(page, profileUrl);
  });

  test("kritik şikâyet profili anında yayından kaldırır", async ({ page }) => {
    await page.goto("/tr/konum/tr/izmir");
    await page.locator("article h3 a").first().click();
    await expect(page).toHaveURL(/\/profil\//);
    const url = page.url();
    await page.getByRole("button", { name: "Şikâyet et" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Ücretli cinsel hizmet tanıtımı").click();
    await dialog.getByLabel("Açıklama").fill("E2E: profil ücretli hizmet çağrışımı yapıyor.");
    await dialog.getByRole("button", { name: "Bildirimi gönder" }).click();
    await expect(page).toHaveURL(/\/bildirim-alindi$/);
    await expect(page.getByRole("status")).toContainText("yayından kaldırıldı");
    await expectRemoved(page, url);
  });
});

test("abonelik durumları yönetilir", async ({ page }) => {
  await login(page);
  await page.goto("/admin/abonelikler");
  await expect(page.getByTestId("subscription-row").first()).toBeVisible();
  await expect(page.getByText("Aktif", { exact: true }).first()).toBeVisible();
  await page.goto("/admin/abonelikler?filtre=yakinda");
  const soon = page.getByTestId("subscription-row");
  await expect(soon.first()).toContainText("Yakında");
  await soon.first().getByRole("button", { name: "İptal" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("E2E iptal");
  await page.getByRole("dialog").getByRole("button", { name: "İptal et" }).click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "iptal edildi" })).toBeVisible();
});

test.describe("erişilebilirlik", () => {
  for (const path of ["/", "/tr/kesfet", "/tr/konum/tr/istanbul", "/tr/guvenlik", "/tr/kaldirma-talebi", "/admin/giris"]) {
    test(`${path} ciddi a11y ihlali içermez`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} — ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }
  test("profil sayfası ciddi a11y ihlali içermez", async ({ page }) => {
    await page.goto("/tr/konum/tr/bursa");
    const href = (await page.locator("article h3 a").first().getAttribute("href"))!;
    await page.goto(href, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  });
});
