import { expect, test } from "@playwright/test";

/** Arama motoru bakışı: yaş çerezi olmadan istek (tarayıcı ve kullanıcıya aynı içerik; cloaking yok). */
test.describe("SEO doğrulama", () => {
  test("sitemap'teki her adres çerezsiz 200, indekslenebilir ve kendi canonical'ına sahip", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const xml = await (await anon.get("/sitemap.xml")).text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    expect(urls.length).toBeGreaterThan(3);
    const titles = new Set<string>();
    for (const path of urls) {
      const res = await anon.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html, `${path} noindex olmamalı`).not.toMatch(/<meta name="robots" content="[^"]*noindex/);
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical && new URL(canonical, baseURL).pathname, `${path} canonical`).toBe(path === "" ? "/" : path);
      expect(html, `${path} og:url`).toMatch(/<meta property="og:url"/);
      expect(html, `${path} açıklama`).toMatch(/<meta name="description" content="[^"]{30,}"/);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
      expect(titles.has(title), `${path} başlığı benzersiz olmalı`).toBe(false);
      titles.add(title);
    }
    await anon.dispose();
  });

  test("yaş kapısı arkasındaki adresler çerezsiz istekte noindex döner ve sitemap'te yoktur", async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
    const xml = await (await anon.get("/sitemap.xml")).text();
    for (const path of ["/", "/kesfet", "/sehir/istanbul"]) {
      const html = await (await anon.get(path)).text();
      expect(html, path).toMatch(/<meta name="robots" content="noindex/);
      expect(xml).not.toContain(`${new URL(path, baseURL).href.replace(/\/$/, "")}</loc>`);
    }
    await anon.dispose();
  });

  test("olmayan profil gerçek 404 döner (soft 404 yok)", async ({ request }) => {
    const res = await request.get("/profil/boyle-bir-profil-yok-123");
    expect(res.status()).toBe(404);
  });

  test("boş il sayfası ve filtreli varyant noindex; varyant canonical temiz", async ({ page }) => {
    await page.goto("/sehir/bayburt");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/sehir/istanbul?yaka=anadolu");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/sehir\/istanbul$/);
  });

  test("ana sayfa ?yaka varyantı ana sayfaya canonical verir; JSON-LD geçerli", async ({ page }) => {
    await page.goto("/?yaka=anadolu");
    expect(new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname).toBe("/");
    for (const path of ["/", "/sehir/istanbul", "/guvenlik"]) {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.length, path).toBeGreaterThan(0);
      for (const b of blocks) expect(() => JSON.parse(b), path).not.toThrow();
    }
  });

  test("robots.txt yönetim ve API'yi engeller, sitemap bildirir", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    expect(robots).toMatch(/Disallow: \/api/);
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  });
});
