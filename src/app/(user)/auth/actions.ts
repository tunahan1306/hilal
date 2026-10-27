"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAppUserRecord, registerInputSchema, submitAgeVerification, submitAgeVerificationInputSchema } from "@/server/services/identity";
import { DomainError } from "@/server/services/errors";
import { AgeVerificationDisabledError } from "@/server/auth/age-verification";
import { assertUser } from "@/server/auth/user-session";
import { USER_SESSION_COOKIE, USER_SESSION_TTL_SECONDS, signUserSession } from "@/server/auth/user-demo-session";
import { createSupabaseServerClient } from "@/server/auth/supabase-server";
import { isSupabaseConfigured } from "@/server/env";
import { clearSharedRateLimit, clientFingerprint, sharedRateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { consumeDemoEmailVerificationToken, issueDemoEmailVerificationToken, setDemoUserPassword, verifyDemoUserPassword } from "@/server/repositories/memory";

export type AuthState = { message: string; devToken?: string } | null;

const GENERIC = "E-posta veya şifre hatalı.";
const WINDOW = 15 * 60_000;

async function limited(email: string, kind: "login" | "register"): Promise<boolean> {
  const fp = await clientFingerprint();
  const [byClient, byEmail] = await Promise.all([
    sharedRateLimit(`${kind}:${fp}`, 10, WINDOW),
    sharedRateLimit(`${kind}-email:${email.toLowerCase()}`, 5, WINDOW),
  ]);
  return !byClient.ok || !byEmail.ok;
}

async function clearLimits(email: string, kind: "login" | "register"): Promise<void> {
  await Promise.all([clearSharedRateLimit(`${kind}:${await clientFingerprint()}`), clearSharedRateLimit(`${kind}-email:${email.toLowerCase()}`)]);
}

async function setUserSessionCookie(userId: string): Promise<void> {
  (await cookies()).set(USER_SESSION_COOKIE, signUserSession({ sub: userId, exp: Math.floor(Date.now() / 1000) + USER_SESSION_TTL_SECONDS }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://"),
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  });
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerInputSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    tosAccepted: formData.get("tosAccepted") === "on",
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  const { email, password } = parsed.data;
  if (await limited(email, "register")) return { message: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." };

  try {
    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error || !data.user) return { message: error?.message ?? "Kayıt oluşturulamadı" };
      await createAppUserRecord({ id: data.user.id, email });
      await clearLimits(email, "register");
      if (!data.session) return { message: "Hesabınız oluşturuldu. E-postanızdaki bağlantıyla doğrulayın." };
      redirect("/hesap");
    }

    // Demo modu: gerçek e-posta gönderimi yok; doğrulama jetonu yalnızca geliştirme
    // kolaylığı olarak sonuçta döndürülür (production'da bu yol hiç devreye girmez).
    const id = crypto.randomUUID();
    await createAppUserRecord({ id, email });
    setDemoUserPassword(id, password);
    const token = issueDemoEmailVerificationToken(id);
    await clearLimits(email, "register");
    await setUserSessionCookie(id);
    return { message: "Hesabınız oluşturuldu (demo modu). Doğrulama jetonu aşağıda gösterilir.", devToken: token };
  } catch (e) {
    if (e instanceof DomainError) return { message: e.message };
    throw e;
  }
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { message: GENERIC };
  const { email, password } = parsed.data;
  if (await limited(email, "login")) return { message: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." };

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { message: GENERIC };
    const user = await getRepository().getAppUserById(data.user.id);
    if (!user || user.status !== "active") {
      await supabase.auth.signOut();
      return { message: GENERIC };
    }
    await clearLimits(email, "login");
    redirect("/hesap");
  }

  const user = await getRepository().getAppUserByEmail(email);
  if (!user || user.status !== "active" || !verifyDemoUserPassword(user.id, password)) return { message: GENERIC };
  await clearLimits(email, "login");
  await setUserSessionCookie(user.id);
  redirect("/hesap");
}

export async function verifyEmailAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { message: "Jeton gerekli" };

  if (isSupabaseConfigured()) {
    const email = String(formData.get("email") ?? "").trim();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type: "email", token_hash: token, email });
    if (error || !data.user) return { message: "Doğrulama bağlantısı geçersiz veya süresi dolmuş." };
    await getRepository().markAppUserEmailVerified(data.user.id, new Date().toISOString());
    redirect("/hesap");
  }

  const user = await assertUser().catch(() => null);
  if (!user) return { message: "Önce giriş yapın." };
  if (!consumeDemoEmailVerificationToken(user.id, token)) return { message: "Jeton geçersiz." };
  await getRepository().markAppUserEmailVerified(user.id, new Date().toISOString());
  redirect("/hesap");
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(USER_SESSION_COOKIE);
  redirect("/giris");
}

/** Yaş doğrulama gönderimi — bkz. submitAgeVerification yorumu: bugün her zaman devre dışı hatası döner. */
export async function submitAgeVerificationAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = submitAgeVerificationInputSchema.safeParse({ providerSessionRef: formData.get("providerSessionRef") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Geçersiz giriş" };
  try {
    const user = await assertUser();
    await submitAgeVerification(user, parsed.data);
    return { message: "Yaş doğrulaması tamamlandı." };
  } catch (e) {
    if (e instanceof AgeVerificationDisabledError) return { message: e.message };
    if (e instanceof DomainError) return { message: e.message };
    throw e;
  }
}
