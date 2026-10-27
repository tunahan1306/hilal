import "server-only";
import { signPayload, verifyPayload } from "./signed-session";

/**
 * Demo modu için son kullanıcı oturum çerezi. admin demo-session.ts'ten KASITLI OLARAK
 * ayrı bir çerez adı kullanır (iki oturum türü hiçbir şekilde karışmaz). Supabase modunda
 * oturumu Supabase Auth yönetir; bu modül yalnızca memory/demo repository ile kullanılır.
 */
export const USER_SESSION_COOKIE = "hilal_user";
export const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 gün

export type UserSessionPayload = { sub: string; exp: number };

export function signUserSession(payload: UserSessionPayload): string {
  return signPayload(payload);
}

export function verifyUserSession(token: string | undefined, now = Date.now()): UserSessionPayload | null {
  return verifyPayload<UserSessionPayload>(token, now);
}
