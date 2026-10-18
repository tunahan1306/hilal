import { expect, test } from "@playwright/test";
import { expectToast, login } from "./helpers";

test("KVKK başvurusu gönderilir ve yönetim panelinde görünür", async ({ page }) => {
  await page.goto("/kaldirma-talebi?profil=ece-tu");
  await expect(page.getByLabel(/İlgili profil bağlantısı/)).toHaveValue(/\/profil\/ece-tu$/);
  await page.getByLabel("Ad soyad").fill("E2E Başvuru Sahibi");
  await page.getByLabel("E-posta").fill("basvuru@example.com");
  await page.getByLabel("Açıklama").fill("E2E: Profilimin kaldırılmasını talep ediyorum.");
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByText("Aydınlatma metnini okuduğunuzu onaylayın")).toBeVisible();
  // Doğrulama hatasında kullanıcının yazdıkları korunur
  await expect(page.getByLabel("Ad soyad")).toHaveValue("E2E Başvuru Sahibi");
  await expect(page.getByLabel("Açıklama")).toHaveValue(/kaldırılmasını talep/);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
  await expect(page.getByRole("status")).toContainText("30 gün içinde");

  await login(page);
  await page.goto("/admin/talepler");
  const row = page.getByTestId("privacy-row").filter({ hasText: "E2E Başvuru Sahibi" }).filter({ visible: true });
  await expect(row).toContainText("Profil kaldırma");
  await expect(row.getByRole("link", { name: "İlgili profili aç" })).toBeVisible();
  await row.getByRole("button", { name: "İşleme al" }).click();
  await expect(row).toContainText("İşlemde");
});

test("abonelik yenilemede süre doğrulanır", async ({ page }) => {
  await login(page);
  await page.goto("/admin/abonelikler");
  const row = page.getByTestId("subscription-row").first();
  await row.getByRole("button", { name: "Yenile" }).click();
  const months = page.getByRole("dialog").getByRole("spinbutton");
  const confirm = page.getByRole("dialog").getByRole("button", { name: "Yenile" });
  // Geçersiz süreyle onay düğmesi pasif kalır (sunucu da 1–24 dışını reddeder: tests/unit).
  for (const bad of ["0", "25", "1.5"]) {
    await months.fill(bad);
    await expect(confirm).toBeDisabled();
  }
  await months.fill("2");
  await confirm.click();
  await expectToast(page, "Abonelik yenilendi");
});

test("sınırı aşan belge sunucuya gönderilmeden uyarı verir", async ({ page }) => {
  await login(page);
  await page.goto("/admin/profiller/prf-0031");
  await page.getByRole("tab", { name: "Rıza ve doğrulama" }).click();
  const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(7 * 1024 * 1024, 32)]);
  await page.getByLabel(/Belge \(isteğe bağlı, PDF/).setInputFiles({ name: "b.pdf", mimeType: "application/pdf", buffer: big });
  await expectToast(page, /Dosya çok büyük/);
  await expect(page.getByLabel(/Belge \(isteğe bağlı, PDF/)).toHaveValue("");
});

test("boş il sayfası doğru boş durum mesajını gösterir", async ({ page }) => {
  await page.goto("/sehir/hakkari");
  await expect(page.getByText("Bu bölgede henüz yayında profil yok")).toBeVisible();
  await expect(page.getByRole("link", { name: "Filtreleri sıfırla" })).toHaveCount(0);
  await page.goto("/sehir/hakkari?dogrulanmis=1");
  await expect(page.getByText("Bu bölgede henüz yayında profil yok")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Filtreleri sıfırla" })).toBeVisible();
});

test("yönetim sayfalarının kendine özgü başlıkları vardır", async ({ page }) => {
  await login(page);
  await expect(page).toHaveTitle("Gösterge paneli · Yönetim | Hilal");
  await page.goto("/admin/profiller");
  await expect(page).toHaveTitle("Profiller · Yönetim | Hilal");
  await page.goto("/yok-boyle-bir-sayfa");
  await expect(page).toHaveTitle(/Sayfa bulunamadı/);
});
