import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test.describe("yönetici kimlik doğrulama", () => {
  test("oturumsuz erişim giriş sayfasına yönlendirilir", async ({ page }) => {
    for (const path of ["/admin", "/admin/profiller", "/admin/sikayetler/x"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/giris/);
    }
  });

  test("sahte oturum çerezi reddedilir", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "hilal_admin", value: "eyJzdWIiOiJhZG1pbi0wMDAxIiwiYWFsIjoiYWFsMiIsImV4cCI6OTk5OTk5OTk5OX0.sahte", url: baseURL! }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/giris/);
  });

  test("yanlış şifre veya eksik TOTP ile giriş başarısız olur", async ({ page }) => {
    await page.goto("/admin/giris");
    await page.getByLabel("E-posta").fill(ADMIN.email);
    await page.getByLabel("Şifre").fill("yanlis-sifre-123");
    await page.getByLabel("Doğrulama kodu (TOTP)").fill("000000");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText(/doğrulama kodu hatalı/)).toBeVisible();
    await page.getByLabel("Şifre").fill(ADMIN.password);
    await page.getByLabel("Doğrulama kodu (TOTP)").fill("123456");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByText(/doğrulama kodu hatalı/)).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/giris/);
  });

  test("doğru bilgiler ve TOTP ile giriş, ardından çıkış", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Toplam profil")).toBeVisible();
    await page.getByRole("button", { name: "Çıkış yap" }).click();
    await expect(page).toHaveURL(/\/admin\/giris/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/giris/);
  });

  test("yönetim sayfaları noindex ve no-store başlığı taşır", async ({ request }) => {
    const res = await request.get("/admin/giris");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  });
});

test("kaba kuvvet denemeleri oran sınırlamasına takılır", async ({ page }) => {
  await page.goto("/admin/giris");
  for (let i = 0; i < 6; i++) {
    await page.getByLabel("E-posta").fill("saldirgan@demo.local");
    await page.getByLabel("Şifre").fill(`yanlis-sifre-${i}`);
    await page.getByLabel("Doğrulama kodu (TOTP)").fill("000000");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/giris")),
      page.getByRole("button", { name: "Giriş yap" }).click(),
    ]);
    await expect(page.locator("p[role=alert]")).toHaveText(i < 5 ? /hatalı/ : /Çok fazla deneme/);
  }
});

test("geliştirme varsayılan sırrıyla imzalanmış oturum production'da reddedilir", async ({ page, context, baseURL }) => {
  const { createHmac } = await import("node:crypto");
  const body = Buffer.from(JSON.stringify({ sub: "admin-0001", aal: "aal2", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const sig = createHmac("sha256", "dev-only-session-secret-change-me-00000000").update(body).digest("base64url");
  await context.addCookies([{ name: "hilal_admin", value: `${body}.${sig}`, url: baseURL! }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/giris/);
});
