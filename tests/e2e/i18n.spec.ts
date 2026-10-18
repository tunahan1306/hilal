import { expect, test } from "@playwright/test";

/** Dört dilde temel akışlar, yerel URL'ler ve eski adres uyumluluğu. */
const LANGS = [
  { lang: "tr", explore: "/tr/kesfet", contact: "/tr/iletisim", title: "Keşfet", send: "Mesajı gönder", nameError: "Ad soyad en az 2 karakter olmalı", notFound: "Sayfa bulunamadı" },
  { lang: "en", explore: "/en/explore", contact: "/en/contact", title: "Explore", send: "Send message", nameError: "Full name must be at least 2 characters", notFound: "Page not found" },
  { lang: "nl", explore: "/nl/ontdekken", contact: "/nl/contact", title: "Ontdekken", send: "Bericht versturen", nameError: "Naam moet minstens 2 tekens bevatten", notFound: "Pagina niet gevonden" },
  { lang: "de", explore: "/de/entdecken", contact: "/de/kontakt", title: "Entdecken", send: "Nachricht senden", nameError: "Der Name muss mindestens 2 Zeichen lang sein", notFound: "Seite nicht gefunden" },
] as const;

test.describe("eski adresler ve dil yönlendirmesi", () => {
  for (const [from, to] of [
    ["/kesfet", "/tr/kesfet"],
    ["/sehir/istanbul/kadikoy", "/tr/konum/tr/istanbul/kadikoy"],
    ["/iletisim", "/tr/iletisim"],
    ["/tr/explore", "/tr/kesfet"],
    ["/de/kesfet", "/de/entdecken"],
    ["/nl/profile/x-1", "/nl/profiel/x-1"],
  ] as const) {
    test(`${from} kalıcı olarak ${to} adresine yönlenir`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers().location!, "http://x").pathname).toBe(to);
    });
  }

  test("kök adres Accept-Language'e, sonra kaydedilen tercihe göre yönlenir", async ({ playwright, baseURL }) => {
    const de = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "accept-language": "de-DE,de;q=0.9" }, storageState: { cookies: [], origins: [] } });
    const r1 = await de.get("/", { maxRedirects: 0 });
    expect(r1.status()).toBe(307);
    expect(r1.headers().location).toMatch(/\/de$/);
    await de.dispose();
    const pref = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "accept-language": "de", cookie: "hilal_lang=nl" }, storageState: { cookies: [], origins: [] } });
    expect((await pref.get("/", { maxRedirects: 0 })).headers().location).toMatch(/\/nl$/);
    await pref.dispose();
  });

  test("tanınmayan dil/sayfa 404, ülke–bölge uyuşmazlığı 404", async ({ request }) => {
    expect((await request.get("/fr/kesfet")).status()).toBe(404);
    expect((await request.get("/en/olmayan-sayfa")).status()).toBe(404);
    expect((await request.get("/en/location/de/noord-holland")).status()).toBe(404);
    expect((await request.get("/en/location/nl/noord-holland/landkreis-muenchen")).status()).toBe(404);
    expect((await request.get("/en/location/nl/noord-holland/amsterdam")).status()).toBe(200);
  });
});

for (const l of LANGS) {
  test.describe(`dil: ${l.lang}`, () => {
    test("ana sayfa, keşif ve hreflang", async ({ page }) => {
      await page.goto(`/${l.lang}`);
      await expect(page.locator("html")).toHaveAttribute("lang", l.lang);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.goto(l.explore);
      await expect(page.getByRole("heading", { level: 1, name: l.title })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => els.map((e) => e.getAttribute("hreflang")));
      expect(alternates.sort()).toEqual(["de", "en", "nl", "tr", "x-default"]);
      // Demo modunda örnek profiller listelenir; boş yerel veritabanında (Supabase modu) boş durum başlığı görünür.
      await expect(process.env.E2E_SUPABASE ? page.locator("main article, main h2").first() : page.locator("main article").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test("iletişim formu yerel doğrulama mesajı gösterir", async ({ page }) => {
      await page.goto(l.contact);
      await page.getByRole("button", { name: l.send }).click();
      await expect(page.getByText(l.nameError)).toBeVisible();
    });

    test("yerel 404 sayfası 404 durum koduyla döner", async ({ page }) => {
      const res = await page.goto(`/${l.lang}/yok-boyle-bir-sayfa-123`);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: l.notFound })).toBeVisible();
    });
  });
}

test("yaş kapısı ziyaretçinin dilinde açılır; ret yerel adrese döner", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/de/entdecken");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.getByRole("button", { name: "Nein, ich bin unter 18" }).click();
  await expect(page).toHaveURL(/\/de\/altersbestaetigung\?declined=1$/);
  await expect(page.getByRole("heading", { name: "Diese Inhalte sind nur für Erwachsene." })).toBeVisible();
  await page.goto("/de/entdecken");
  await page.getByRole("button", { name: "Ja, ich bin 18 oder älter" }).click();
  await expect(page).toHaveURL(/\/de\/entdecken$/);
  await ctx.close();
});

test("dil seçici sayfayı ve konumu korur", async ({ page }) => {
  await page.goto("/tr/konum/nl/noord-holland/amsterdam?yasMin=25");
  await page.getByRole("button", { name: /Dil seçimi/ }).click();
  await page.getByRole("menuitem", { name: "Deutsch" }).click();
  await expect(page).toHaveURL(/\/de\/ort\/nl\/noord-holland\/amsterdam\?yasMin=25$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { level: 1, name: "Amsterdam" })).toBeVisible();
});

test("keşifte ülke filtresi yalnızca o ülkenin bölgelerini sunar", async ({ page }) => {
  await page.goto("/en/explore?ulke=de");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/explore$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.getByRole("combobox", { name: "Province / region", exact: true }).first().click();
  await expect(page.getByRole("option", { name: "Bayern" })).toBeVisible();
  await expect(page.getByRole("option", { name: "İstanbul" })).toHaveCount(0);
});
