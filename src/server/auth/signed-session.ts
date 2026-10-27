import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requiredSecret } from "../env";

/**
 * Genel imzalı oturum çerezi yardımcıları (HMAC-SHA256). demo-session.ts (yönetici) ve
 * user-demo-session.ts (son kullanıcı) bu ortak ilkel üzerine kurulur — iki ayrı oturum
 * türü aynı kriptografik örüntüyü paylaşır, farklı yeniden uygulamalar riski taşımaz.
 */
function secret(): string {
  return requiredSecret("SESSION_SECRET", "dev-only-session-secret-change-me-00000000");
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signPayload<T extends { exp: number }>(payload: T): string {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPayload<T extends { exp: number }>(token: string | undefined, now = Date.now()): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}
