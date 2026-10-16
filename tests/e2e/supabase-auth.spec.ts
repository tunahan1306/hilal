/**
 * Yalnızca Supabase modunda çalışır (E2E_SUPABASE=1, Supabase env ile build edilmiş uygulama).
 * Doğrular: şifre girişi → zorunlu TOTP kurulumu → AAL2 → panel; MFA'sız oturum panele giremez.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import * as OTPAuth from "otpauth";

test.skip(!process.env.E2E_SUPABASE, "Supabase modu kapalı");

test("Supabase: zorunlu TOTP kurulumu ve AAL2 ile giriş", async ({ page }) => {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `e2e-${Date.now()}@test.local`;
  const password = "E2e-Supabase-Pass-123!";
  const { data } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  await service.from("admins").insert({ id: data.user!.id, email, display_name: "E2E", role: "owner" });
  try {
    await page.goto("/admin/giris");
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre").fill(password);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page).toHaveURL(/adim=mfa-kurulum/);

    // AAL1 oturumla panel erişilemez
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/giris\?adim=mfa/);

    await page.goto("/admin/giris?adim=mfa-kurulum");
    const secretText = page.locator("p.font-mono");
    await expect(secretText).toBeVisible();
    const secret = (await secretText.textContent())!.trim();
    await page.getByLabel("Doğrulama kodu (TOTP)").fill(new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret) }).generate());
    await page.getByRole("button", { name: "Doğrula" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Gösterge paneli" })).toBeVisible();
  } finally {
    await service.auth.admin.deleteUser(data.user!.id);
  }
});
