import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Admin } from "@/domain/types";
import { isSupabaseConfigured } from "../env";
import { getRepository } from "../repositories";
import { DEMO_SESSION_COOKIE, verifySession } from "./demo-session";
import { createSupabaseServerClient } from "./supabase-server";

export type AdminSession = { admin: Admin; aal: "aal1" | "aal2" };

/**
 * Oturumdaki yöneticiyi döndürür. Her çağrıda sunucu tarafında doğrulanır;
 * istemciden gelen hiçbir bilgiye güvenilmez.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const repo = getRepository();
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const admin = await repo.getAdmin(data.user.id);
    if (!admin) return null;
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return { admin, aal: aal?.currentLevel === "aal2" ? "aal2" : "aal1" };
  }
  const token = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  const payload = verifySession(token);
  if (!payload) return null;
  const admin = await repo.getAdmin(payload.sub);
  return admin ? { admin, aal: payload.aal } : null;
}

/** Yönetici + MFA (AAL2) zorunlu. Aksi halde giriş sayfasına yönlendirir. */
export async function requireAdmin(): Promise<Admin> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/giris");
  if (session.aal !== "aal2") redirect("/admin/giris?adim=mfa");
  return session.admin;
}

export class AuthorizationError extends Error {
  constructor() {
    super("Yetkisiz işlem");
  }
}

/** Server Action'lar için: yönlendirme yerine hata fırlatır. */
export async function assertAdmin(): Promise<Admin> {
  const session = await getAdminSession();
  if (!session || session.aal !== "aal2") throw new AuthorizationError();
  return session.admin;
}
