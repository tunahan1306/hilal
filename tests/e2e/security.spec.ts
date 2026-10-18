import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

// playwright.config.ts → TEST_SECRETS.SESSION_SECRET (yalnızca test sunucusu)
const SESSION_SECRET = "e2e-session-secret-0123456789abcdef012345678";
function token(payload: object, secret = SESSION_SECRET) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
const exp = () => Math.floor(Date.now() / 1000) + 3600;

async function withSession(page: Page, value: string, baseURL: string) {
  await page.context().addCookies([{ name: "hilal_admin", value, url: baseURL }]);
}

async function submitContact(page: Page, subject: string) {
  await page.goto("/tr/iletisim");
  await page.getByLabel("Ad soyad").fill("Güvenlik Testi");
  await page.getByLabel("E-posta").fill("sec@test.local");
  await page.getByLabel("Konu", { exact: true }).fill(subject);
  await page.getByLabel("Mesaj", { exact: true }).fill("Sentetik güvenlik testi mesajı; gerçek bir talep değildir.");
  await page.getByLabel(/Aydınlatma metnini okudum/).check();
  await page.waitForTimeout(2_100);
  await page.getByRole("button", { name: "Mesajı gönder" }).click();
}

test.describe.configure({ mode: "serial" });

test.describe("yetki yükseltme ve oturum", () => {
  test("MFA'sız (aal1) oturum yönetim sayfasına giremez", async ({ page, baseURL }) => {
    await withSession(page, token({ sub: "admin-0001", aal: "aal1", exp: exp() }), baseURL!);
    await page.goto("/admin/iletisim");
    await expect(page).toHaveURL(/\/admin\/giris\?adim=mfa/);
  });

  for (const [name, value] of [
    ["imzası bozulmuş", token({ sub: "admin-0001", aal: "aal2", exp: exp() }, "yanlis-sir-0000000000000000000000000000000")],
    ["süresi dolmuş", token({ sub: "admin-0001", aal: "aal2", exp: Math.floor(Date.now() / 1000) - 10 })],
    ["yönetici olmayan kimlik", token({ sub: "kullanici-9999", aal: "aal2", exp: exp() })],
    ["rastgele değer", "abc.def"],
  ] as const) {
    test(`${name} oturum çerezi reddedilir`, async ({ page, baseURL }) => {
      await withSession(page, value, baseURL!);
      await page.goto("/admin/iletisim");
      await expect(page).toHaveURL(/\/admin\/giris/);
      await expect(page.getByRole("heading", { name: /İletişim talepleri/ })).toHaveCount(0);
    });
  }

  test("yakalanan Server Action oturumsuz tekrar oynatılamaz (durum değişmez)", async ({ page, browser, baseURL }) => {
    await submitContact(page, `Replay ${Date.now()}`);
    await expect(page.getByRole("status").filter({ hasText: "Mesajınız alındı" })).toBeVisible();
    await login(page);
    await page.goto("/admin/iletisim");
    await page.getByTestId("contact-row").filter({ visible: true }).first().getByRole("link").click();
    await page.waitForLoadState("networkidle");
    const detailUrl = page.url();
    const captured = page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]));
    await page.getByRole("button", { name: "İşleme al" }).click();
    const req = await captured;
    await expect(page.getByText("Durum değişti: İşlemde")).toBeVisible();

    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const res = await anon.request.post(req.url(), { headers: { ...req.headers(), cookie: "" }, data: req.postDataBuffer() ?? undefined, maxRedirects: 0 });
    const body = await res.text();
    // Oturumsuz istek proxy tarafından yönlendirilir veya eylem yetkisiz yanıt döner; her iki durumda da işlem yapılmaz.
    expect(res.status() === 307 || res.status() === 303 || /Oturumunuz sona erdi/.test(body)).toBe(true);
    await anon.close();

    // Sahte (yönetici olmayan) imzalı oturumla da aynı sonuç
    const forged = await browser.newContext();
    await forged.addCookies([{ name: "hilal_admin", value: token({ sub: "kullanici-9999", aal: "aal2", exp: exp() }), url: baseURL! }]);
    const res2 = await forged.request.post(req.url(), { headers: { ...req.headers(), cookie: `hilal_admin=${token({ sub: "kullanici-9999", aal: "aal2", exp: exp() })}` }, data: req.postDataBuffer() ?? undefined, maxRedirects: 0 });
    expect(await res2.text()).toMatch(/Oturumunuz sona erdi/);
    await forged.close();

    await page.goto(detailUrl);
    await expect(page.getByText("Durum değişti: İşlemde")).toHaveCount(1);
  });

  test("bilinmeyen mesaj kimliği bulunamadı gösterir, veri sızdırmaz", async ({ page }) => {
    await login(page);
    await page.goto("/admin/iletisim/msg-yok-00000000");
    await page.waitForLoadState("networkidle");
    // Yönetim düzeni Suspense içinde akıttığı için durum kodu 200 kalır (noindex alan); içerik bulunamadı sayfasıdır.
    await expect(page.getByText(/bulunamadı/i).first()).toBeVisible();
    await expect(page.getByText("İşlem geçmişi")).toHaveCount(0);
  });
});

test.describe("iletişim formu kötüye kullanım", () => {
  test("aynı mesaj tekrar gönderilemez; sınır aşılınca anlaşılır uyarı", async ({ page }) => {
    const subject = `Tekrar ${Date.now()}`;
    await submitContact(page, subject);
    await expect(page.getByRole("status").filter({ hasText: "Mesajınız alındı" })).toBeVisible();
    await submitContact(page, subject);
    await expect(page.locator('form [role="alert"]')).toContainText(/az önce alındı|Çok fazla istek/);
    let limited = false;
    for (let i = 0; i < 4 && !limited; i++) {
      await submitContact(page, `Sınır ${i} ${Date.now()}`);
      // Sunucu yanıtını bekle: başarı mesajı ya da form uyarısı
      const outcome = page.getByRole("status").filter({ hasText: "Mesajınız alındı" }).or(page.locator('form [role="alert"]'));
      await expect(outcome.first()).toBeVisible();
      const alert = page.locator('form [role="alert"]');
      limited = (await alert.count()) > 0 && /Çok fazla istek/.test(await alert.innerText());
    }
    expect(limited).toBe(true);
    // Teknik ayrıntı sızmaz
    await expect(page.locator("body")).not.toContainText(/relation|PGRST|stack|Error:/);
  });
});
