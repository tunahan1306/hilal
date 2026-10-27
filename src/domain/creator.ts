// Modül C — Creator Platform. Kaynak: creator_accounts / content_rights /
// creator_subscription_tiers / creator_subscriptions / creator_payouts
// (20261027000004_creator_platform.sql). Admin-küratörlü `membership_plans`/`subscriptions`'tan
// KASITLI OLARAK AYRI — farklı sahip, farklı güven modeli (bkz. 00_AUDIT.md, 02a_DATA_MODEL.md
// "creator_subscription_tiers" notu). Modül D için hiçbir tür/sabit yoktur.

export const CREATOR_ACCOUNT_STATUSES = ["pending", "active", "suspended"] as const;
export type CreatorAccountStatus = (typeof CREATOR_ACCOUNT_STATUSES)[number];

export type CreatorAccount = {
  id: string;
  userId: string;
  legalName: string;
  countryCode: string;
  status: CreatorAccountStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
};
export type NewCreatorAccount = Pick<CreatorAccount, "userId" | "legalName" | "countryCode">;

export const CONTENT_RIGHTS_TYPES = ["self_generated", "licensed"] as const;
export type ContentRightsType = (typeof CONTENT_RIGHTS_TYPES)[number];

/** content_rights — bir medya varlığının kullanım hakkı kanıtı; profile_consents/verification_records'taki kanıt-işaretçi deseniyle birebir. */
export type ContentRights = {
  id: string;
  mediaAssetId: string;
  rightsType: ContentRightsType;
  evidencePath: string | null;
  confirmedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};
export type NewContentRights = Pick<ContentRights, "mediaAssetId" | "rightsType" | "evidencePath">;

export type CreatorSubscriptionTier = {
  id: string;
  creatorId: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  description: string | null;
  active: boolean;
  createdAt: string;
};
export type NewCreatorSubscriptionTier = Pick<CreatorSubscriptionTier, "creatorId" | "name" | "priceAmount" | "priceCurrency" | "description">;

export const CREATOR_SUBSCRIPTION_STATUSES = ["active", "cancelled", "expired"] as const;
export type CreatorSubscriptionStatus = (typeof CREATOR_SUBSCRIPTION_STATUSES)[number];

/**
 * Gerçek ödeme entegrasyonu olmadığı için (bkz. src/server/payments.ts) bu tablo bugün
 * yalnızca şema olarak var olur — hiçbir Server Action gerçek bir satır oluşturamaz
 * (subscribeToTier her zaman PaymentsDisabledError ile sonlanır, satın alma asla
 * tamamlanmaz). Modül F'in sağlayıcısı entegre olana kadar yapısal olarak atıl kalır.
 */
export type CreatorSubscription = {
  id: string;
  subscriberId: string;
  tierId: string;
  status: CreatorSubscriptionStatus;
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  externalRef: string | null;
  createdAt: string;
};
export type NewCreatorSubscription = Omit<CreatorSubscription, "id" | "createdAt">;

export const CREATOR_PAYOUT_STATUSES = ["pending", "paid", "failed"] as const;
export type CreatorPayoutStatus = (typeof CREATOR_PAYOUT_STATUSES)[number];

/** Modül F'in gerçek payout akışına kadar yalnızca şema/okuma amaçlı — hiçbir çağıran yoktur. */
export type CreatorPayout = {
  id: string;
  creatorId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  status: CreatorPayoutStatus;
  externalRef: string | null;
  createdAt: string;
};
export type NewCreatorPayout = Omit<CreatorPayout, "id" | "createdAt">;

/** Creator hesabı aktif mi? (onaylı, askıya alınmamış). */
export function isActiveCreatorAccount(account: Pick<CreatorAccount, "status"> | null | undefined): boolean {
  return account?.status === "active";
}

/** Verilen tüm medya varlıkları için incelenmiş (reviewed_by dolu) bir hak kaydı var mı? — ücretli gönderi yayın ön koşulu. */
export function allMediaRightsReviewed(mediaAssetIds: string[], rights: Pick<ContentRights, "mediaAssetId" | "reviewedAt">[]): boolean {
  return mediaAssetIds.every((id) => rights.some((r) => r.mediaAssetId === id && r.reviewedAt !== null));
}

/** Abonelik şu an aktif mi? (durum + süre, isAgeVerified ile aynı "en güncel + süresi geçmedi" deseni). */
export function isSubscriptionActive(sub: Pick<CreatorSubscription, "status" | "endsAt"> | null | undefined, now = new Date()): boolean {
  return Boolean(sub && sub.status === "active" && sub.endsAt >= now.toISOString());
}
