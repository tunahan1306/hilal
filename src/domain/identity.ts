// Modül A — Kimlik & Doğrulama. Kaynak: app_users / user_roles / age_verification_checks /
// consent_records (20261027000001_identity_foundation.sql). `admins` (personel) ile
// KARIŞTIRILMAMALI — bu, kendi kendine kayıt olan ayrı bir güven modelidir (bkz.
// docs/transformation/00_AUDIT.md).

export const APP_USER_STATUSES = ["active", "suspended", "deleted"] as const;
export type AppUserStatus = (typeof APP_USER_STATUSES)[number];

export type AppUser = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  status: AppUserStatus;
  createdAt: string;
  updatedAt: string;
};

export const USER_ROLES = ["member", "creator"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CONSENT_RECORD_TYPES = ["tos", "privacy_policy", "marketing", "age_attestation"] as const;
export type ConsentRecordType = (typeof CONSENT_RECORD_TYPES)[number];

export type ConsentRecord = {
  id: string;
  userId: string;
  type: ConsentRecordType;
  grantedAt: string;
  revokedAt: string | null;
  method: string;
  evidenceRef: string | null;
  createdAt: string;
};
export type NewConsentRecord = Omit<ConsentRecord, "id" | "createdAt" | "grantedAt" | "revokedAt"> & { revokedAt?: string | null };

export const AGE_VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type AgeVerificationStatus = (typeof AGE_VERIFICATION_STATUSES)[number];

export type AgeVerificationCheck = {
  id: string;
  userId: string;
  provider: string;
  providerRef: string;
  status: AgeVerificationStatus;
  checkedAt: string | null;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
};
export type NewAgeVerificationCheck = Omit<AgeVerificationCheck, "id" | "createdAt">;

/** Sağlayıcıdan onaylı sonuç gelmiş ve süresi geçmemiş mi? (ham belge/biyometrik veri hiç görülmez). */
export function isAgeVerified(checks: AgeVerificationCheck[], now = new Date()): boolean {
  const latest = [...checks].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest || latest.status !== "approved") return false;
  return !latest.expiresAt || latest.expiresAt >= now.toISOString();
}

/** Belirli türde geri çekilmemiş bir rıza var mı? (profile_consents'teki aynı kural). */
export function hasActiveConsent(records: ConsentRecord[], type: ConsentRecordType): boolean {
  return records.some((r) => r.type === type && r.revokedAt === null);
}
