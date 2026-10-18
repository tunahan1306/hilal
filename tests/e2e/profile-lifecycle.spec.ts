import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { expectToast, login, pick } from "./helpers";

test("profil oluşturma → yayın engeli → ön koşullar → yayın → arşiv", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  // Oluştur
  await page.goto("/admin/profiller/yeni");
  await page.getByLabel("Takma ad").fill("E2E Deneme");
  await page.getByLabel("Doğum tarihi").fill("1993-03-03");
  await pick(page, "İl", "İzmir");
  await pick(page, "İlçe", "Karşıyaka");
  await page.getByLabel("Biyografi").fill("Uçurtma festivalleri ve sahil bisikleti seven sentetik bir test profili.");
  await page.getByText("Bisiklet", { exact: true }).click();
  await page.getByLabel("WhatsApp telefon numarası").fill("+90 532 000 00 00");
  const contactConsent = page.getByRole("checkbox", { name: /açık yazılı iznini aldım/ });
  await contactConsent.check();
  await page.getByLabel("WhatsApp telefon numarası").fill("05320000000");
  await expect(contactConsent).not.toBeChecked();
  await contactConsent.check();
  await page.getByRole("button", { name: "Taslak oluştur" }).click();
  await expect(page).toHaveURL(/\/admin\/profiller\/[^/]+\?yeni=1/);
  await expect(page.getByRole("heading", { name: "E2E Deneme" })).toBeVisible();

  // Yayın yetkisi yokken yayınlanamaz
  const publish = page.getByTestId("publish-button");
  await expect(publish).toBeDisabled();
  await expect(page.getByTestId("publish-checklist").locator('[data-passed="false"]')).toHaveCount(5);

  // Rıza + doğrulama
  await page.getByRole("tab", { name: "Rıza ve doğrulama" }).click();
  await page.getByLabel("Alınma yöntemi").fill("Islak imzalı muvafakatname (E2E)");
  await page.getByRole("button", { name: "Rıza kaydı ekle" }).click();
  await expectToast(page, "Rıza kaydı eklendi");
  await pick(page, "Rıza türü", "Fotoğraf kullanım izni");
  await page.getByLabel("Alınma yöntemi").fill("Fotoğraf kullanım sözleşmesi (E2E)");
  await page.getByRole("button", { name: "Rıza kaydı ekle" }).click();
  await expect(page.getByText("Fotoğraf kullanım izni", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Yöntem", { exact: true }).fill("Kimlik belgesi yüz yüze kontrol (E2E)");
  await page.getByRole("button", { name: "Doğrulama kaydı ekle" }).click();
  await expectToast(page, "Doğrulama kaydı eklendi");

  // Fotoğraf
  await page.getByRole("tab", { name: /Fotoğraflar/ }).click();
  const png = await sharp({ create: { width: 400, height: 500, channels: 3, background: "#7799aa" } }).png().toBuffer();
  await page.getByLabel(/Fotoğraf \(JPEG/).setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("Alternatif metin").fill("Sentetik test görseli");
  await page.getByRole("button", { name: "Yükle" }).click();
  await expectToast(page, "Fotoğraf yüklendi");
  await page.getByRole("button", { name: "Hakkı doğrula" }).click();
  await expect(page.getByText("Hak doğrulandı")).toBeVisible();

  // Moderasyon + yayın
  await page.getByRole("tab", { name: "Yayın" }).click();
  await page.getByRole("button", { name: "Moderasyonu onayla" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Onayla" }).click();
  await expectToast(page, "Moderasyon onaylandı");
  await expect(page.getByTestId("publish-checklist").locator('[data-passed="false"]')).toHaveCount(0);
  await expect(publish).toBeEnabled();
  await publish.click();
  await expectToast(page, "Profil yayınlandı");

  const slug = (await page.getByText(/\/profil\//).first().textContent())!.match(/\/profil\/([a-z0-9-]+)/)![1];
  const res = await page.goto(`/tr/profil/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Deneme");
  await expect(page.getByText("Karşıyaka, İzmir").first()).toBeVisible();
  const whatsapp = page.getByRole("link", { name: /ile WhatsApp üzerinden iletişim kur/ });
  await expect(whatsapp).toHaveAttribute("href", "https://wa.me/905320000000");
  await expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer nofollow");
  await expect(whatsapp).toHaveAttribute("target", "_blank");

  // Arşiv → kamuya kapalı
  await page.goBack();
  await page.getByRole("button", { name: "Arşivle" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Arşivle" }).click();
  await expectToast(page, "Profil arşivlendi");
  await page.goto(`/tr/profil/${slug}`);
  await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("yayın ön koşulu eksik profil liste görünümünde 'Eksik' olarak işaretlenir", async ({ page }) => {
  await login(page);
  await page.goto("/admin/profiller?durum=in_review");
  const row = page.getByTestId("profile-row").filter({ hasText: "İnceleme Örnek" }).filter({ visible: true });
  await expect(row).toContainText("Eksik");
  await row.getByRole("link").click();
  await expect(page.getByTestId("publish-button")).toBeDisabled();
});
