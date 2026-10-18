import { expect, test } from "@playwright/test";

test.describe("mobil navigasyon", () => {
  test("alt navigasyon görünür ve çalışır, masaüstü menüsü gizlidir", async ({ page }) => {
    await page.goto("/tr");
    const bottom = page.getByRole("navigation", { name: "Mobil menü" });
    await expect(bottom).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Ana menü" })).toBeHidden();
    await bottom.getByRole("link", { name: "Şehirler" }).click();
    await expect(page).toHaveURL(/\/sehirler$/);
    await expect(bottom.getByRole("link", { name: "Şehirler" })).toHaveAttribute("aria-current", "page");
    await bottom.getByRole("link", { name: "Keşfet" }).click();
    await expect(page).toHaveURL(/\/tr\/kesfet$/);
  });

  test("filtreler alt sayfada (sheet) açılır ve uygulanır", async ({ page }) => {
    await page.goto("/tr/kesfet");
    await page.getByRole("button", { name: /Filtreler/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Filtreler" })).toBeVisible();
    await sheet.getByRole("switch", { name: "Doğrulanmış" }).click();
    await expect(page).toHaveURL(/dogrulanmis=1/);
    await sheet.getByRole("button", { name: /sonucu göster/ }).click();
    await expect(sheet).toBeHidden();
  });

  test("yatay kaydırma yoktur", async ({ page }) => {
    for (const path of ["/", "/tr/kesfet", "/tr/konum/tr/istanbul", "/tr/sehirler"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("dokunma hedefleri yeterince büyüktür", async ({ page }) => {
    await page.goto("/tr");
    for (const link of await page.getByRole("navigation", { name: "Mobil menü" }).getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test("yönetim profil sekmeleri mobilde içerikle çakışmaz", async ({ page }) => {
  const { login } = await import("./helpers");
  await login(page);
  await page.goto("/admin/profiller/prf-0002");
  const list = page.getByRole("tablist");
  const listBox = (await list.boundingBox())!;
  const panelBox = (await page.getByRole("tabpanel").boundingBox())!;
  expect(listBox.height).toBeLessThanOrEqual(48);
  expect(panelBox.y).toBeGreaterThanOrEqual(listBox.y + listBox.height);
  await page.getByRole("tab", { name: "Veri (KVKK)" }).click();
  await expect(page.getByRole("button", { name: /Verileri dışa aktar/ })).toBeVisible();
});
