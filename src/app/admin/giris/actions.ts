"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/domain/schemas";
import { demoAdminConfig, safeEqual, verifyTotp } from "@/server/auth/demo-credentials";
import { DEMO_SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/server/auth/demo-session";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { isSupabaseConfigured } from "@/server/env";
import { clientFingerprint, rateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { audit } from "@/server/services/audit";

export type LoginState = { message: string } | null;

const GENERIC = "E-posta, şifre veya doğrulama kodu hatalı.";
const WINDOW = 15 * 60_000;

async function limited(email: string): Promise<boolean> {
  const fp = await clientFingerprint();
  return !rateLimit(`login:${fp}`, 10, WINDOW).ok || !rateLimit(`login-email:${email.toLowerCase()}`, 5, WINDOW).ok;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    totp: formData.get("totp") ?? "",
  });
  if (!parsed.success) return { message: GENERIC };
  const { email, password, totp } = parsed.data;
  if (await limited(email)) return { message: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { message: GENERIC };
    const admin = await getRepository().getAdmin(data.user.id);
    if (!admin) {
      await supabase.auth.signOut();
      return { message: GENERIC };
    }
    const factors = await supabase.auth.mfa.listFactors();
    const totpFactor = factors.data?.totp.find((f) => f.status === "verified");
    if (!totpFactor) redirect("/admin/giris?adim=mfa-kurulum");
    if (!totp) redirect("/admin/giris?adim=mfa");
    const verified = await supabase.auth.mfa.challengeAndVerify({ factorId: totpFactor.id, code: totp });
    if (verified.error) return { message: GENERIC };
    await audit(admin, "admin.login", "admin", admin.id);
    redirect("/admin");
  }

  // Demo modu
  const cfg = demoAdminConfig();
  const okEmail = safeEqual(email.toLowerCase(), cfg.email.toLowerCase());
  const okPass = safeEqual(password, cfg.password);
  const okTotp = Boolean(totp) && verifyTotp(cfg.totpSecret, totp!);
  if (!okEmail || !okPass || !okTotp) return { message: GENERIC };
  const admin = await getRepository().getAdminByEmail(cfg.email);
  if (!admin) return { message: GENERIC };
  (await cookies()).set(
    DEMO_SESSION_COOKIE,
    signSession({ sub: admin.id, aal: "aal2", exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }),
    { httpOnly: true, secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://"), sameSite: "strict", path: "/", maxAge: SESSION_TTL_SECONDS },
  );
  await audit(admin, "admin.login", "admin", admin.id, { mode: "demo" });
  redirect("/admin");
}

/** Supabase: mevcut (AAL1) oturum için TOTP doğrulaması. */
export async function verifyMfaAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("totp") ?? "");
  if (!/^\d{6}$/.test(code)) return { message: "6 haneli kodu girin." };
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || (await limited(user.user.email ?? user.user.id))) return { message: GENERIC };
  const factors = await supabase.auth.mfa.listFactors();
  const factor = factors.data?.totp.find((f) => f.status === "verified") ?? factors.data?.all.find((f) => f.factor_type === "totp");
  if (!factor) return { message: "Kayıtlı doğrulayıcı bulunamadı." };
  const res = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (res.error) return { message: GENERIC };
  redirect("/admin");
}

/** Supabase: ilk girişte TOTP doğrulayıcı kaydı başlatır. */
export async function enrollMfa(): Promise<{ qr: string; secret: string; factorId: string } | { error: string }> {
  if (!isSupabaseConfigured()) return { error: "Demo modunda MFA sabit yapılandırılmıştır." };
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || !(await getRepository().getAdmin(user.user.id))) return { error: "Önce giriş yapın." };
  const res = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `hilal-${Date.now()}` });
  if (res.error) return { error: res.error.message };
  return { qr: res.data.totp.qr_code, secret: res.data.totp.secret, factorId: res.data.id };
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(DEMO_SESSION_COOKIE);
  redirect("/admin/giris");
}
