import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { AppUser } from "@/domain/identity";
import { isSupabaseConfigured } from "../env";
import { getRepository } from "../repositories";
import { USER_SESSION_COOKIE, verifyUserSession } from "./user-demo-session";
import { createSupabaseServerClient } from "./supabase-server";

/**
 * Son kullanıcı oturumu (app_users). admins/AdminSession ile KARIŞTIRILMAMALI —
 * tamamen ayrı bir çerez/oturum yolu (bkz. session.ts).
 */

/**
 * Oturumdaki son kullanıcıyı döndürür. Her çağrıda sunucu tarafında doğrulanır.
 */
export async function getUserSession(): Promise<AppUser | null> {
  await connection();
  const repo = getRepository();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return repo.getAppUserById(data.user.id);
  }
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  const payload = verifyUserSession(token);
  if (!payload) return null;
  return repo.getAppUserById(payload.sub);
}

/** Kullanıcı yoksa veya hesabı aktif değilse giriş sayfasına yönlendirir (sayfa/layout için). */
export async function requireUser(): Promise<AppUser> {
  const user = await getUserSession();
  if (!user || user.status !== "active") redirect("/giris");
  return user;
}

export class UserAuthorizationError extends Error {
  constructor() {
    super("Yetkisiz işlem");
  }
}

/** Server Action'lar için: yönlendirme yerine hata fırlatır. */
export async function assertUser(): Promise<AppUser> {
  const user = await getUserSession();
  if (!user || user.status !== "active") throw new UserAuthorizationError();
  return user;
}
