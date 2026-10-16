import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requiredSecret } from "../env";

/**
 * Demo modu için imzalı oturum çerezi (HMAC-SHA256). Supabase modunda
 * oturumu Supabase Auth yönetir; bu modül kullanılmaz.
 */
export const DEMO_SESSION_COOKIE = "hilal_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type DemoSessionPayload = { sub: string; aal: "aal1" | "aal2"; exp: number };

function secret(): string {
  return requiredSecret("SESSION_SECRET", "dev-only-session-secret-change-me-00000000");
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");

export function signSession(payload: DemoSessionPayload): string {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined, now = Date.now()): DemoSessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as DemoSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}
