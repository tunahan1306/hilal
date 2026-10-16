import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
import * as OTPAuth from "otpauth";

/**
 * Demo modu yönetici bilgileri. Yalnızca yerel geliştirme ve testler içindir.
 * Production'da Supabase Auth + TOTP MFA kullanılır.
 */
export const DEV_DEFAULTS = {
  email: "admin@demo.local",
  password: "demo-admin-2026!",
  // Base32 TOTP sırrı — yalnızca geliştirme. Production'da asla kullanılmaz.
  totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
};

/** Production'da varsayılan (herkesçe bilinen) şifre ve TOTP sırrı asla kullanılmaz. */
export function demoAdminConfig() {
  const prod = process.env.NODE_ENV === "production";
  const password = process.env.DEMO_ADMIN_PASSWORD || (prod ? null : DEV_DEFAULTS.password);
  const totpSecret = process.env.DEMO_ADMIN_TOTP_SECRET || (prod ? null : DEV_DEFAULTS.totpSecret);
  if (!password || !totpSecret) throw new Error("DEMO_ADMIN_PASSWORD ve DEMO_ADMIN_TOTP_SECRET production'da zorunludur");
  return { email: process.env.DEMO_ADMIN_EMAIL || DEV_DEFAULTS.email, password, totpSecret };
}

function hash(value: string): Buffer {
  return scryptSync(value, "hilal-demo-compare", 32);
}

export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(hash(a), hash(b));
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30, algorithm: "SHA1" });
  return totp.validate({ token, window: 1 }) !== null;
}
