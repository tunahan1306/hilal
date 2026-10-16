import { expect, test } from "@playwright/test";

test.describe("mobil navigasyon", () => {
  test("alt navigasyon görünür ve çalışır, masaüstü menüsü gizlidir", async ({ page }) => {
    await page.goto("/");
    const bottom = page.getByRole("navigation", { name: "Mobil menü" });
    await expect(bottom).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Ana menü" })).toBeHidden();
    await bottom.getByRole("link", { name: "Şehirler" }).click();
    await expect(page).toHaveURL(/\/sehirler$/);
    await expect(bottom.getByRole("link", { name: "Şehirler" })).toHaveAttribute("aria-current", "page");
    await bottom.getByRole("link", { name: "Keşfet" }).click();
    await expect(page).toHaveURL(/\/kesfet$/);
  });

  test("filtreler alt sayfada (sheet) açılır ve uygulanır", async ({ page }) => {
    await page.goto("/kesfet");
    await page.getByRole("button", { name: /Filtreler/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Filtreler" })).toBeVisible();
    await sheet.getByRole("button", { name: "Kitap kulübü" }).click();
    await expect(page).toHaveURL(/ilgi=kitap-kulubu/);
    await sheet.getByRole("button", { name: /sonucu göster/ }).click();
    await expect(sheet).toBeHidden();
  });

  test("yatay kaydırma yoktur", async ({ page }) => {
    for (const path of ["/", "/kesfet", "/sehir/istanbul", "/sehirler"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("dokunma hedefleri yeterince büyüktür", async ({ page }) => {
    await page.goto("/");
    for (const link of await page.getByRole("navigation", { name: "Mobil menü" }).getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
