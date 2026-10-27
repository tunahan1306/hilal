import "server-only";
import { z } from "zod";
import type { AgeVerificationCheck, AppUser } from "@/domain/identity";
import { getAgeVerificationProvider } from "@/server/auth/age-verification";
import { getRepository } from "../repositories";
import { DomainError } from "./errors";

export const registerInputSchema = z.object({
  email: z.email("Geçerli bir e-posta girin"),
  password: z.string().min(12, "Şifre en az 12 karakter olmalı").max(200),
  tosAccepted: z.literal(true, { message: "Kullanım şartlarını kabul etmelisiniz" }),
});
export type RegisterInput = z.input<typeof registerInputSchema>;

export const submitAgeVerificationInputSchema = z.object({
  providerSessionRef: z.string().trim().min(1, "Sağlayıcı oturum referansı gerekli").max(200),
});
export type SubmitAgeVerificationInput = z.input<typeof submitAgeVerificationInputSchema>;

/**
 * Supabase/memory auth kullanıcısı oluşturulduktan SONRA çağrılır (bu fonksiyon kimlik
 * doğrulamayı değil, app_users + zorunlu rıza kayıtlarını oluşturur). E-posta tekilliği
 * burada da denetlenir: Supabase Auth zaten tekil e-postayı zorunlu kılar, ama memory
 * modunda bu denetim yalnızca burada vardır.
 */
export async function createAppUserRecord(input: { id: string; email: string }): Promise<AppUser> {
  const repo = getRepository();
  const existing = await repo.getAppUserByEmail(input.email);
  if (existing) throw new DomainError("Bu e-posta ile zaten bir hesap var", "email_taken");
  const user = await repo.createAppUser(input);
  // KVKK/ToS rızası kayıt anında, açık onayla alınır (profile_consents'teki desenle aynı:
  // yalnızca eklenir, geri çekilebilir — bkz. 20261027000001 migration yorumu).
  await repo.addConsentRecord({ userId: user.id, type: "tos", method: "web_form", evidenceRef: null });
  await repo.addConsentRecord({ userId: user.id, type: "privacy_policy", method: "web_form", evidenceRef: null });
  return user;
}

/**
 * Yaş doğrulama sonucu — ham belge/biyometrik veri bu fonksiyona hiçbir zaman geçmez,
 * yalnızca sağlayıcının oturum referansı. Sağlayıcı henüz seçilmediği için (bkz.
 * age-verification.ts) bu çağrı bugün her zaman AgeVerificationDisabledError fırlatır;
 * uydurma bir "onaylandı" sonucu üretilmez.
 */
export async function submitAgeVerification(user: Pick<AppUser, "id">, raw: SubmitAgeVerificationInput): Promise<AgeVerificationCheck> {
  const input = submitAgeVerificationInputSchema.parse(raw);
  const provider = getAgeVerificationProvider();
  const result = await provider.verifySession(input.providerSessionRef);
  return getRepository().addAgeVerificationCheck({
    userId: user.id,
    provider: provider.name,
    providerRef: result.providerRef,
    status: result.status,
    checkedAt: new Date().toISOString(),
    expiresAt: result.expiresAt ?? null,
    note: null,
  });
}
