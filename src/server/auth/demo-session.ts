import "server-only";
import { signPayload, verifyPayload } from "./signed-session";

/**
 * Demo modu için imzalı oturum çerezi. Supabase modunda oturumu Supabase Auth yönetir;
 * bu modül kullanılmaz. Kriptografik ilkel signed-session.ts'te (admin/kullanıcı ortak).
 */
export const DEMO_SESSION_COOKIE = "hilal_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type DemoSessionPayload = { sub: string; aal: "aal1" | "aal2"; exp: number };

export function signSession(payload: DemoSessionPayload): string {
  return signPayload(payload);
}

export function verifySession(token: string | undefined, now = Date.now()): DemoSessionPayload | null {
  return verifyPayload<DemoSessionPayload>(token, now);
}
