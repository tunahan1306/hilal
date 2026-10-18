import { expect, test } from "@playwright/test";
import { expectToast, login, pick } from "./helpers";

/**
 * Ülke yayın kapısı (demo modu): yalnızca Türkiye için demo kararı vardır; NL ve DE incelenmemiştir.
 * Kapalı ülkede profil listesi yerine bilgi notu, noindex ve sitemap dışı; yönetimde yalnızca sahip
 * karar kaydedebilir, karar geri çekilince profiller anında kamuya kapanır.
 */
test.skip(Boolean(process.env.E2E_SUPABASE), "Demo deposu gerekir");
test.describe.configure({ mode: "serial" });

test("kapalı ülke: bilgi notu, noindex, ülke sekmesi ve sitemap'te yok", async ({ page, request }) => {
  for (const [path, title] of [
    ["/de/ort/de/bayern", "In diesem Land ist die Veröffentlichung noch nicht freigegeben"],
    ["/nl/locatie/nl", "Publicatie is in dit land nog niet open"],
    ["/en/location/nl/noord-holland/amsterdam", "Publication is not open in this country yet"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("status").filter({ hasText: title })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator("main article")).toHaveCount(0);
  }
  // Açık ülke indekslenebilir kalır.
  await page.goto("/tr/konum/tr/istanbul");
  await expect(page.locator("main article").first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  // Yalnızca bir ülke açıkken ana sayfada ülke sekmesi gösterilmez; kapalı ülke istenirse açık ülkeye düşülür.
  await page.goto("/de?ulke=nl");
  await expect(page.getByRole("navigation", { name: /Land/ })).toHaveCount(0);
  await expect(page.locator("main article").first()).toBeVisible();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/tr/konum/tr<");
  expect(sitemap).not.toMatch(/\/(konum|location|locatie|ort)\/(nl|de)</);
});

test("ülke kararı: sahip kaydeder; izin kanıt ister; geri çekilince profiller kapanır", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/admin/ulkeler");
  await expect(page.getByRole("heading", { name: "Ülkeler ve yayın" })).toBeVisible();
  // Rol tabanlı bulucu gizli (akış sırasındaki) kopyaları dışarıda bırakır.
  const region = (name: string) => page.getByRole("region", { name });
  await expect(region("Türkiye (TR)").getByTestId("country-status-tr")).toHaveText("Yayına açık");
  await expect(region("Hollanda (NL)").getByTestId("country-status-nl")).toContainText("İncelenmedi");

  // Türkiye için onayı geri çek.
  const tr = region("Türkiye (TR)");
  await tr.getByText("Yeni karar kaydet").click();
  await tr.getByLabel(/Sorumlu kişi/).fill("E2E Test Sorumlusu");
  await tr.getByLabel(/Onay: ülke kodunu yazın/).fill("tr");
  await tr.getByRole("button", { name: "Kararı kaydet" }).click();
  await expectToast(page, "TR için karar kaydedildi.");
  await expect(tr.getByTestId("country-status-tr")).toContainText("kapalı");

  // Profiller durum değişmeden kamuya kapanır.
  await page.goto("/tr/kesfet");
  await expect(page.locator("main article")).toHaveCount(0);
  await page.goto("/tr");
  await expect(page.getByRole("status").filter({ hasText: "hiçbir ülkede profil yayını açık değil" })).toBeVisible();

  // Kanıtsız izin kararı reddedilir; kanıtla açılır.
  await page.goto("/admin/ulkeler");
  const tr2 = region("Türkiye (TR)");
  await tr2.getByText("Yeni karar kaydet").click();
  await pick(page, "Yeni durum", "Yayına izinli");
  await tr2.getByLabel(/Sorumlu kişi/).fill("E2E Test Sorumlusu");
  await tr2.getByLabel(/Dayanak belge referansı/).fill("ab");
  await tr2.getByLabel(/gözden geçirme tarihi/).fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  await tr2.getByLabel(/Onay: ülke kodunu yazın/).fill("tr");
  await tr2.getByRole("button", { name: "Kararı kaydet" }).click();
  await expectToast(page, /kanıt/);
  await tr2.getByLabel(/Dayanak belge referansı/).fill("E2E-REF-001");
  await tr2.getByRole("button", { name: "Kararı kaydet" }).click();
  await expectToast(page, "TR için karar kaydedildi.");
  await expect(tr2.getByTestId("country-status-tr")).toHaveText("Yayına açık");
  await page.goto("/tr/kesfet");
  await expect(page.locator("main article").first()).toBeVisible();

  // Karar geçmişi ve denetim kaydı
  await page.goto("/admin/ulkeler");
  await expect(region("Türkiye (TR)").getByText(/Karar geçmişi \(3\)/)).toBeVisible();
  await page.goto("/admin/denetim");
  await expect(page.getByText("country.publication_decision").first()).toBeVisible();
});
