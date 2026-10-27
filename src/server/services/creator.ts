import "server-only";
import { z } from "zod";
import { COUNTRY_CODES, type CountryCode } from "@/domain/countries";
import { CONTENT_RIGHTS_TYPES, isActiveCreatorAccount, type CreatorAccount, type CreatorSubscriptionTier } from "@/domain/creator";
import type { AppUser } from "@/domain/identity";
import type { Admin } from "@/domain/types";
import { getPaymentProvider } from "../payments";
import { getPolicyGate } from "./policy";
import { getRepository } from "../repositories";
import { audit } from "./audit";
import { DomainError } from "./errors";

export const applyCreatorAccountInputSchema = z.object({
  legalName: z.string().trim().min(2, "Yasal ad gerekli").max(160),
  countryCode: z.enum(COUNTRY_CODES),
});
export type ApplyCreatorAccountInput = z.input<typeof applyCreatorAccountInputSchema>;

/** Creator ekonomisine katılım başvurusu — her kullanıcının yalnızca bir başvurusu olabilir; onay admin tarafından yapılır. */
export async function applyCreatorAccount(actor: AppUser, raw: ApplyCreatorAccountInput): Promise<CreatorAccount> {
  const input = applyCreatorAccountInputSchema.parse(raw);
  const repo = getRepository();
  if (await repo.getCreatorAccountByUserId(actor.id)) throw new DomainError("Zaten bir creator başvurunuz var", "creator_account_exists");
  return repo.createCreatorAccount({ userId: actor.id, legalName: input.legalName, countryCode: input.countryCode });
}

export async function getOwnCreatorAccount(actor: AppUser): Promise<CreatorAccount | null> {
  return getRepository().getCreatorAccountByUserId(actor.id);
}

/** Admin onayı — status=active olunca user_roles'e creator rolü veritabanı tetikleyicisiyle eklenir. */
export async function approveCreatorAccount(admin: Admin, creatorAccountId: string, now = new Date()): Promise<CreatorAccount> {
  const row = await getRepository().updateCreatorAccountStatus(creatorAccountId, "active", { approvedBy: admin.id, approvedAt: now.toISOString() });
  await audit(admin, "creator_account.approved", "creator_account", row.id, { userId: row.userId });
  return row;
}

export async function suspendCreatorAccount(admin: Admin, creatorAccountId: string): Promise<CreatorAccount> {
  const existing = await getRepository().getCreatorAccountById(creatorAccountId);
  if (!existing) throw new DomainError("Creator hesabı bulunamadı", "not_found");
  const row = await getRepository().updateCreatorAccountStatus(creatorAccountId, "suspended", { approvedBy: existing.approvedBy, approvedAt: existing.approvedAt });
  await audit(admin, "creator_account.suspended", "creator_account", row.id, { userId: row.userId });
  return row;
}

export const recordContentRightsInputSchema = z.object({
  mediaAssetId: z.string().trim().min(1, "Medya kimliği gerekli"),
  rightsType: z.enum(CONTENT_RIGHTS_TYPES),
});
export type RecordContentRightsInput = z.input<typeof recordContentRightsInputSchema>;

/**
 * İçerik hakkı kendi kendine beyan edilir (self-attestation) — ham kanıt belgesi bu
 * sürümde taşınmaz (evidencePath null), tıpkı yaş doğrulamasında ham belgenin hiç
 * geçmemesi gibi. Admin incelemesi (reviewContentRights) olmadan ücretli yayın
 * koşulu sağlanmaz (bkz. posts_public view).
 */
export async function recordContentRights(actor: AppUser, raw: RecordContentRightsInput): Promise<void> {
  const input = recordContentRightsInputSchema.parse(raw);
  const repo = getRepository();
  const media = await repo.getMediaAsset(input.mediaAssetId);
  if (!media || media.ownerId !== actor.id) throw new DomainError("Medya bulunamadı", "not_found");
  if (await repo.getContentRightsByMediaAsset(input.mediaAssetId)) throw new DomainError("Bu medya için zaten bir hak kaydı var", "rights_exists");
  await repo.addContentRights({ mediaAssetId: input.mediaAssetId, rightsType: input.rightsType, evidencePath: null });
}

export async function reviewContentRights(admin: Admin, contentRightsId: string, now = new Date()): Promise<void> {
  const row = await getRepository().reviewContentRights(contentRightsId, admin.id, now.toISOString());
  await audit(admin, "content_rights.reviewed", "content_rights", row.id, { mediaAssetId: row.mediaAssetId });
}

export const createSubscriptionTierInputSchema = z.object({
  name: z.string().trim().min(1, "Ad gerekli").max(60),
  priceAmount: z.number().positive("Fiyat pozitif olmalı"),
  priceCurrency: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}$/, "Para birimi 3 harfli olmalı (ör. try)")
    .default("try"),
  description: z.string().trim().max(1000).optional(),
});
export type CreateSubscriptionTierInput = z.input<typeof createSubscriptionTierInputSchema>;

/** Yalnızca onaylı creator hesabı tier tanımlayabilir — tier'ın kamuya görünürlüğü PolicyGate'e tabidir (bkz. getPublicSubscriptionTiers). */
export async function createSubscriptionTier(actor: AppUser, raw: CreateSubscriptionTierInput): Promise<CreatorSubscriptionTier> {
  const input = createSubscriptionTierInputSchema.parse(raw);
  const repo = getRepository();
  const creator = await repo.getCreatorAccountByUserId(actor.id);
  if (!isActiveCreatorAccount(creator)) throw new DomainError("Yalnızca onaylı creator hesabı abonelik planı oluşturabilir", "creator_not_active");
  return repo.createSubscriptionTier({ creatorId: creator!.id, name: input.name, priceAmount: input.priceAmount, priceCurrency: input.priceCurrency, description: input.description ?? null });
}

export async function listOwnSubscriptionTiers(actor: AppUser): Promise<CreatorSubscriptionTier[]> {
  const creator = await getRepository().getCreatorAccountByUserId(actor.id);
  if (!creator) return [];
  return getRepository().listSubscriptionTiersByCreator(creator.id);
}

/** Kamuya gösterilecek, PolicyGate'e göre ülkesinde ücretli abonelik izinli bir creator'ın aktif tier'ları. */
export async function getPublicSubscriptionTiers(creatorUserId: string): Promise<CreatorSubscriptionTier[]> {
  const repo = getRepository();
  const creator = await repo.getCreatorAccountByUserId(creatorUserId);
  if (!isActiveCreatorAccount(creator)) return [];
  const permitted = await getPolicyGate().isPermitted(creator!.countryCode as CountryCode, "paid_subscriptions");
  if (!permitted) return [];
  return (await repo.listSubscriptionTiersByCreator(creator!.id)).filter((t) => t.active);
}

export const subscribeInputSchema = z.object({ tierId: z.string().trim().min(1, "Plan kimliği gerekli") });
export type SubscribeInput = z.input<typeof subscribeInputSchema>;

/**
 * Abonelik satın alma girişimi — src/server/payments.ts'teki PaymentProvider gerçek bir
 * sağlayıcı onaylanana kadar her zaman PaymentsDisabledError fırlatır; bu fonksiyon asla
 * uydurma bir "abone olundu" sonucu üretmez (submitAgeVerification ile aynı duruş).
 */
export async function subscribeToTier(actor: AppUser, raw: SubscribeInput): Promise<void> {
  const input = subscribeInputSchema.parse(raw);
  const repo = getRepository();
  const tier = await repo.getSubscriptionTier(input.tierId);
  if (!tier || !tier.active) throw new DomainError("Abonelik planı bulunamadı", "not_found");
  const creator = await repo.getCreatorAccountById(tier.creatorId);
  if (!isActiveCreatorAccount(creator)) throw new DomainError("Bu creator şu anda abonelik satışı yapamıyor", "creator_not_active");
  const permitted = await getPolicyGate().isPermitted(creator!.countryCode as CountryCode, "paid_subscriptions");
  if (!permitted) throw new DomainError("Bu ülkede ücretli abonelik özelliği henüz izinli değil", "feature_not_permitted");
  if (actor.id === creator!.userId) throw new DomainError("Kendi aboneliğinize abone olamazsınız", "cannot_subscribe_self");
  // Buradan sonrası her zaman PaymentsDisabledError fırlatır — gerçek bir satır asla oluşmaz.
  getPaymentProvider();
}
