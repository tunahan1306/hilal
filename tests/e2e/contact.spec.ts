import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectToast, login } from "./helpers";

async function fillContact(page: Page, subject: string) {
  await page.getByText("Teknik destek", { exact: true }).click();
  await page.getByLabel("Ad soyad").fill("E2E Test Kişi");
  await page.getByLabel("E-posta").fill("e2e@test.local");
  await page.getByLabel("Konu", { exact: true }).fill(subject);
  await page.getByLabel("Mesaj", { exact: true }).fill("Sentetik uçtan uca test mesajı; gerçek bir talep değildir.");
  await page.getByLabel(/Aydınlatma metnini okudum/).check();
}

test.describe("iletişim sayfası", () => {
  test("başlık, açıklama ve bağlantılar görünür; ciddi a11y ihlali yok", async ({ page }) => {
    await page.goto("/iletisim");
    await expect(page.getByRole("heading", { level: 1, name: "İletişim" })).toBeVisible();
    await expect(page.getByText("Sorularınız, önerileriniz ve platformla ilgili talepleriniz için bizimle iletişime geçebilirsiniz.")).toBeVisible();
    await expect(page.getByRole("link", { name: "KVKK aydınlatma metni" })).toHaveAttribute("href", "/kvkk");
    await expect(page.locator("footer").getByRole("link", { name: "İletişim" })).toHaveAttribute("href", "/iletisim");
    // Yapılandırılmamış iletişim e-postası uydurulmaz
    await expect(page.getByText("@example.com")).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test("istemci doğrulaması boş formu göndermez ve hataları gösterir", async ({ page }) => {
    await page.goto("/iletisim");
    await page.getByRole("button", { name: "Mesajı gönder" }).click();
    await expect(page.getByText("Ad soyad en az 2 karakter olmalı")).toBeVisible();
    await expect(page.getByText("Geçerli bir e-posta girin")).toBeVisible();
    await expect(page.getByText("Mesaj en az 20 karakter olmalı")).toBeVisible();
    await expect(page.getByText("Aydınlatma metnini okuduğunuzu onaylayın")).toBeVisible();
    await expect(page.getByLabel("Ad soyad")).toBeFocused();
  });

  test("HTML içeren mesaj reddedilir, yazılanlar korunur", async ({ page }) => {
    await page.goto("/iletisim");
    await fillContact(page, "XSS denemesi");
    await page.getByLabel("Mesaj", { exact: true }).fill("<img src=x onerror=alert(1)> bu bir deneme mesajıdır");
    await page.getByRole("button", { name: "Mesajı gönder" }).click();
    await expect(page.getByText("HTML karakterleri (< >) kullanılamaz")).toBeVisible();
    await expect(page.getByLabel("Konu", { exact: true })).toHaveValue("XSS denemesi");
  });

  test("gönderim kaydedilir ve yönetim panelinde okunup durum değiştirilir", async ({ page }) => {
    const subject = `E2E konu ${Date.now()}`;
    await page.goto("/iletisim?konu=support");
    await expect(page.getByLabel("Teknik destek")).toBeChecked();
    await fillContact(page, subject);
    await page.waitForTimeout(2_100); // bot süzgeci: en kısa doldurma süresi
    await page.getByRole("button", { name: "Mesajı gönder" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mesajınız alındı" })).toBeVisible();

    await login(page);
    await expect(page.getByRole("link", { name: /İletişim talepleri/ }).first()).toBeVisible();
    await page.goto("/admin/iletisim?okunmamis=1");
    const row = page.getByTestId("contact-row").filter({ hasText: subject, visible: true });
    await expect(row).toBeVisible();
    await expect(row.getByText("Okunmadı")).toBeAttached();
    await row.getByRole("link", { name: subject }).click();
    await expect(page.getByRole("heading", { level: 1, name: subject })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("link", { name: "e2e@test.local" })).toBeVisible();
    await expect(page.getByText("Okundu", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Yanıtlandı" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Onayla|Evet|Yanıtlandı/ }).last().click();
    await expectToast(page, "Mesaj durumu güncellendi.");
    await expect(page.getByText("Durum değişti: Yanıtlandı")).toBeVisible();

    await page.goto("/admin/iletisim?okunmamis=1");
    await expect(page.getByTestId("contact-row").filter({ hasText: subject, visible: true })).toHaveCount(0);
    await page.goto(`/admin/iletisim?q=${encodeURIComponent(subject)}&durum=answered`);
    await expect(page.getByTestId("contact-row").filter({ hasText: subject, visible: true })).toBeVisible();
  });

  test("oturumsuz yönetim sayfası girişe yönlendirir", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/admin/iletisim");
    await expect(page).toHaveURL(/\/admin\/giris/);
    await ctx.close();
  });
});
