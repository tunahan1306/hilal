export const PROFILE_STATUSES = ["draft", "in_review", "published", "unpublished", "archived"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const MODERATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type Interest = { id: string; slug: string; name: string; description: string | null };

export const MEDIA_KINDS = ["image", "video"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
/** İşleme hattı durumu: yükleniyor → işleniyor → hazır | başarısız */
export const MEDIA_STATUSES = ["uploading", "processing", "ready", "failed"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];
/** Yayın onayı (moderasyon). Yalnızca "approved" medya kamuya teslim edilir. */
export const MEDIA_MODERATION = ["pending", "approved", "rejected"] as const;
export type MediaModeration = (typeof MEDIA_MODERATION)[number];
/** Sahiplik / kullanım hakkı kaynağı */
export const MEDIA_OWNERSHIP_SOURCES = ["owner", "photographer_licensed", "other_licensed"] as const;
export type MediaOwnershipSource = (typeof MEDIA_OWNERSHIP_SOURCES)[number];
export const MEDIA_OWNERSHIP_LABELS: Record<MediaOwnershipSource, string> = {
  owner: "Profil sahibine ait",
  photographer_licensed: "Fotoğrafçı lisansıyla",
  other_licensed: "Diğer — yazılı izinle",
};

export type ProfileMedia = {
  id: string;
  profileId: string;
  kind: MediaKind;
  status: MediaStatus;
  /** Özel depodaki işlenmiş dosya (görsel: ≤2400px WebP, video: orijinal konteyner) */
  storagePath: string;
  /** Özel depodaki küçük önizleme (görsel) veya poster (video) */
  thumbPath: string | null;
  /** Yalnızca onaylandıktan sonra dolu: herkese açık depodaki adres */
  publicUrl: string | null;
  publicPosterUrl: string | null;
  publicPaths: string[];
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  durationSeconds: number | null;
  alt: string;
  position: number;
  isCover: boolean;
  /** Sahiplik ve kullanım hakkı kaydı */
  rightsConfirmed: boolean;
  ownershipSource: MediaOwnershipSource | null;
  ownershipNote: string | null;
  rightsConfirmedBy: string | null;
  rightsConfirmedAt: string | null;
  /** Yayın onayı kaydı */
  moderation: MediaModeration;
  moderatedBy: string | null;
  moderatedAt: string | null;
  sha256: string | null;
  dhash: string | null;
  failureReason: string | null;
  createdAt: string;
};

/** Geriye dönük ad (eski kod yolları) */
export type ProfileImage = ProfileMedia;

export type Profile = {
  id: string;
  slug: string;
  nickname: string;
  /** Yalnızca yönetim tarafında tutulur, kamuya yaş olarak yansır. */
  birthDate: string;
  provincePlate: number;
  districtSlug: string | null;
  /** Düz metin özeti (kartlar, meta açıklama, içerik taraması); zengin metinden türetilir */
  bio: string;
  /** Zengin biyografi (doğrulanmış JSON belge, HTML yok) */
  bioDoc: import("./rich-text").RichDoc | null;
  whatsappPhone?: string | null;
  whatsappConsentAt?: string | null;
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

export const MODERATION_ACTION_LABELS: Record<ModerationActionType, string> = {
  review_started: "İncelemeye alındı",
  content_removed: "İçerik kaldırıldı",
  profile_unpublished: "Profil yayından kaldırıldı",
  profile_restored: "Profil geri yüklendi",
  report_rejected: "Şikâyet reddedildi",
  report_resolved: "Şikâyet sonuçlandı",
  appeal_received: "İtiraz alındı",
  appeal_accepted: "İtiraz kabul edildi",
  appeal_rejected: "İtiraz reddedildi",
  auto_unpublished: "Otomatik yayından kaldırma",
};

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
  /** Profil başına medya depolama kotası (MB). Adet sınırı yoktur. */
  storageQuotaMb: number;
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

export const CONTACT_CATEGORIES = ["general", "support", "partnership", "content_report", "other"] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: "Genel soru",
  support: "Teknik destek",
  partnership: "İş birliği",
  content_report: "Profil veya içerik bildirimi",
  other: "Diğer",
};

export const CONTACT_LIMITS = { name: 120, email: 200, subject: 150, message: 3000 } as const;

export const CONTACT_STATUSES = ["new", "in_progress", "answered", "closed", "spam"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Yeni",
  in_progress: "İşlemde",
  answered: "Yanıtlandı",
  closed: "Kapatıldı",
  spam: "Spam",
};

export type ContactMessage = {
  id: string;
  category: ContactCategory;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  /** İlk açılış zamanı; null = okunmadı. */
  readAt: string | null;
  /** Tuzlu IP özeti (ham IP saklanmaz); yalnızca kötüye kullanım sınırı için. */
  ipHash: string;
  createdAt: string;
  updatedAt: string;
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
  /** Explicitly fictional public example, never a verified real person. */
  isExample?: boolean;
  id: string;
  slug: string;
  nickname: string;
  age: number;
  province: { plate: number; name: string; slug: string };
  district: { name: string; slug: string } | null;
  bio: string;
  bioDoc: import("./rich-text").RichDoc | null;
  interests: Pick<Interest, "slug" | "name">[];
  /** Exposed only with the owner’s explicit publication permission. */
  whatsappPhone?: string | null;
  verified: boolean;
  sponsored: boolean;
  images: { url: string; alt: string; width: number; height: number }[];
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
