export const PROFILE_STATUSES = ["draft", "in_review", "published", "unpublished", "archived"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type Interest = { id: string; slug: string; name: string; description: string | null };

export type ProfileImage = {
  id: string;
  profileId: string;
  storagePath: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  position: number;
  /** Kullanım hakkı (telif / kişilik hakkı) doğrulandı mı */
  rightsConfirmed: boolean;
  createdAt: string;
};

export type Profile = {
  id: string;
  slug: string;
  nickname: string;
  /** Yalnızca yönetim tarafında tutulur, kamuya yaş olarak yansır. */
  birthDate: string;
  provincePlate: number;
  districtSlug: string | null;
  bio: string;
  interestIds: string[];
  status: ProfileStatus;
  moderationStatus: ModerationStatus;
  moderationNote: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  noindex: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const CONSENT_TYPES = ["publication", "photo_rights", "data_processing"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export type ProfileConsent = {
  id: string;
  profileId: string;
  type: ConsentType;
  grantedAt: string;
  revokedAt: string | null;
  /** Private storage içindeki belge yolu (ör. imzalı rıza metni) */
  evidencePath: string | null;
  method: string;
  recordedBy: string;
};

export const VERIFICATION_TYPES = ["age", "identity"] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];
export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type VerificationRecord = {
  id: string;
  profileId: string;
  type: VerificationType;
  status: VerificationStatus;
  method: string;
  documentPath: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
  /** Belge saklama süresi sonu — süre dolunca belge silinir, kayıt kalır */
  retainUntil: string | null;
  note: string | null;
  createdAt: string;
};

export const REPORT_CATEGORIES = [
  "fake_profile",
  "unauthorized_photo",
  "impersonation",
  "harassment",
  "suspected_minor",
  "paid_sexual_services",
  "personal_data",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  fake_profile: "Sahte profil",
  unauthorized_photo: "İzinsiz fotoğraf",
  impersonation: "Kimlik taklidi",
  harassment: "Taciz",
  suspected_minor: "Reşit olmayan kişi şüphesi",
  paid_sexual_services: "Ücretli cinsel hizmet tanıtımı",
  personal_data: "Kişisel veri ihlali",
  other: "Diğer",
};

/** Bu kategorilerde gelen şikâyet profili otomatik olarak yayından kaldırır. */
export const CRITICAL_REPORT_CATEGORIES: readonly ReportCategory[] = [
  "suspected_minor",
  "paid_sexual_services",
  "impersonation",
  "unauthorized_photo",
];

export const REPORT_STATUSES = ["open", "in_review", "resolved", "rejected", "appealed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ModerationReport = {
  id: string;
  profileId: string;
  category: ReportCategory;
  description: string;
  reporterEmail: string | null;
  status: ReportStatus;
  resolution: string | null;
  /** IP adresinin tuzlu özeti — ham IP saklanmaz */
  reporterHash: string;
  createdAt: string;
  updatedAt: string;
};

export const MODERATION_ACTION_TYPES = [
  "review_started",
  "content_removed",
  "profile_unpublished",
  "profile_restored",
  "report_rejected",
  "report_resolved",
  "appeal_received",
  "appeal_accepted",
  "appeal_rejected",
  "auto_unpublished",
] as const;
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export type ModerationAction = {
  id: string;
  reportId: string | null;
  profileId: string;
  type: ModerationActionType;
  note: string | null;
  actorId: string | null;
  createdAt: string;
};

export const PLAN_CODES = ["basic", "plus", "premium"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export type MembershipPlan = {
  id: string;
  code: PlanCode;
  name: string;
  description: string;
  maxPhotos: number;
  sponsoredEligible: boolean;
  advancedStats: boolean;
  customization: boolean;
  priceMonthlyTry: number;
  active: boolean;
};

export const SUBSCRIPTION_STATUSES = ["scheduled", "active", "expired", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = {
  id: string;
  profileId: string;
  planId: string;
  startsAt: string;
  endsAt: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  sponsored: boolean;
  cancelledAt: string | null;
  /** Ödeme sağlayıcı referansı — ilk sürümde her zaman null (tahsilat yok) */
  externalRef: string | null;
  note: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export const PRIVACY_REQUEST_TYPES = ["removal", "access", "deletion", "correction", "objection"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_LABELS: Record<PrivacyRequestType, string> = {
  removal: "Profil kaldırma",
  access: "Verilerime erişim",
  deletion: "Verilerimin silinmesi",
  correction: "Düzeltme",
  objection: "İşlemeye itiraz",
};

export const PRIVACY_REQUEST_STATUSES = ["received", "in_progress", "completed", "rejected"] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export type PrivacyRequest = {
  id: string;
  type: PrivacyRequestType;
  profileId: string | null;
  profileUrl: string | null;
  requesterName: string;
  requesterEmail: string;
  relation: "self" | "representative" | "other";
  details: string;
  status: PrivacyRequestStatus;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type SeoPage = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  canonical: string | null;
  /** null = otomatik karar */
  indexOverride: boolean | null;
  intro: string | null;
  updatedAt: string;
};

export type SiteSettings = {
  siteName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  reportsEnabled: boolean;
};

export type Admin = {
  id: string;
  email: string;
  displayName: string;
  role: "owner" | "moderator";
  mfaEnrolled: boolean;
  createdAt: string;
};

/** Ziyaretçiye gösterilen, hassas alanlardan arındırılmış profil görünümü. */
export type PublicProfile = {
  id: string;
  slug: string;
  nickname: string;
  age: number;
  province: { plate: number; name: string; slug: string };
  district: { name: string; slug: string } | null;
  bio: string;
  interests: Pick<Interest, "slug" | "name">[];
  verified: boolean;
  sponsored: boolean;
  images: Pick<ProfileImage, "url" | "alt" | "width" | "height">[];
  videos?: PublicVideo[];
  publishedAt: string;
  updatedAt: string;
  seo: { title: string | null; description: string | null; noindex: boolean };
};

export type PublicVideo = {
  url: string;
  posterUrl: string | null;
  alt: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  mimeType: string;
};
