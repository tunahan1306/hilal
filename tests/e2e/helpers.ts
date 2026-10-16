import { expect, type Page } from "@playwright/test";
import * as OTPAuth from "otpauth";

export const ADMIN = { email: "admin@demo.local", password: "demo-admin-2026!", totp: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP" };

export function totp() {
  return new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(ADMIN.totp), digits: 6, period: 30 }).generate();
}

export async function login(page: Page) {
  await page.goto("/admin/giris");
  await page.getByLabel("E-posta").fill(ADMIN.email);
  await page.getByLabel("Şifre").fill(ADMIN.password);
  await page.getByLabel("Doğrulama kodu (TOTP)").fill(totp());
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Gösterge paneli" })).toBeVisible();
}

/** Radix Select: etiketle tetikleyiciyi aç, seçeneği seç. */
export async function pick(page: Page, label: string | RegExp, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
