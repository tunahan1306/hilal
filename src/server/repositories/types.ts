import type { ProfileFilters } from "@/domain/filters";
import type {
  Admin,
  AuditLog,
  Interest,
  MembershipPlan,
  ModerationAction,
  ModerationReport,
  PrivacyRequest,
  Profile,
  ProfileConsent,
  ProfileImage,
  PublicProfile,
  SeoPage,
  SiteSettings,
  Subscription,
  VerificationRecord,
} from "@/domain/types";

export type NewProfile = Omit<
  Profile,
  "id" | "createdAt" | "updatedAt" | "publishedAt" | "archivedAt" | "moderatedAt" | "moderatedBy" | "moderationNote"
>;
export type ProfilePatch = Partial<Omit<Profile, "id" | "createdAt" | "createdBy">>;

export type SearchResult = { items: PublicProfile[]; total: number };
export type LocationCount = { plate: number; districtSlug: string | null; count: number };

export type DashboardCounts = {
  totalProfiles: number;
  published: number;
  drafts: number;
  inReview: number;
  openReports: number;
  activeSubscriptions: number;
  expiringSoon: number;
  openPrivacyRequests: number;
};

export type DailyViews = { day: string; views: number };

/**
 * Veri erişim sözleşmesi. Uygulama katmanı yalnızca bu arayüzü bilir; Supabase
 * ve bellek içi (demo) uygulamaları birbirinin yerine kullanılabilir.
 */
export interface Repository {
  readonly kind: "supabase" | "memory";

  // Kamuya açık okuma (yalnızca yayındaki profiller)
  searchPublicProfiles(filters: ProfileFilters, opts: { limit: number; offset: number }): Promise<SearchResult>;
  getPublicProfile(slug: string): Promise<PublicProfile | null>;
  listFeaturedProfiles(limit: number): Promise<PublicProfile[]>;
  countPublishedByLocation(): Promise<LocationCount[]>;
  listPublicProfileSlugs(): Promise<{ slug: string; updatedAt: string }[]>;

  // İlgi alanları
  listInterests(): Promise<Interest[]>;
  createInterest(input: { name: string; slug: string; description: string | null }): Promise<Interest>;
  deleteInterest(id: string): Promise<void>;

  // Profiller (yönetim)
  listProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileBySlug(slug: string): Promise<Profile | null>;
  createProfile(input: NewProfile): Promise<Profile>;
  updateProfile(id: string, patch: ProfilePatch): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;

  listImages(profileId: string): Promise<ProfileImage[]>;
  addImage(input: Omit<ProfileImage, "id" | "createdAt">): Promise<ProfileImage>;
  updateImage(id: string, patch: Partial<Pick<ProfileImage, "alt" | "position" | "rightsConfirmed">>): Promise<ProfileImage>;
  deleteImage(id: string): Promise<ProfileImage | null>;
  /** Dosyayı depolamaya yazar, kalıcı yol ve URL döndürür. */
  storeImageFile(path: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  removeImageFile(path: string): Promise<void>;
  storePrivateDocument(path: string, data: Buffer, contentType: string): Promise<void>;
  removePrivateDocument(path: string): Promise<void>;

  listConsents(profileId: string): Promise<ProfileConsent[]>;
  addConsent(input: Omit<ProfileConsent, "id" | "revokedAt">): Promise<ProfileConsent>;
  revokeConsent(id: string, at: string): Promise<ProfileConsent>;

  listVerifications(profileId: string): Promise<VerificationRecord[]>;
  addVerification(input: Omit<VerificationRecord, "id" | "createdAt">): Promise<VerificationRecord>;
  /** Saklama süresi dolmuş doğrulama belgeleri */
  listExpiredVerificationDocuments(now: string): Promise<VerificationRecord[]>;
  clearVerificationDocument(id: string): Promise<void>;

  // Moderasyon
  listReports(filter?: { status?: ModerationReport["status"]; profileId?: string }): Promise<ModerationReport[]>;
  getReport(id: string): Promise<ModerationReport | null>;
  createReport(input: Omit<ModerationReport, "id" | "createdAt" | "updatedAt" | "status" | "resolution">): Promise<ModerationReport>;
  updateReport(id: string, patch: Partial<Pick<ModerationReport, "status" | "resolution">>): Promise<ModerationReport>;
  countRecentReportsByHash(hash: string, sinceIso: string): Promise<number>;
  listModerationActions(filter: { reportId?: string; profileId?: string }): Promise<ModerationAction[]>;
  addModerationAction(input: Omit<ModerationAction, "id" | "createdAt">): Promise<ModerationAction>;

  // Abonelikler
  listPlans(): Promise<MembershipPlan[]>;
  listSubscriptions(filter?: { profileId?: string }): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | null>;
  createSubscription(input: Omit<Subscription, "id" | "createdAt" | "cancelledAt">): Promise<Subscription>;
  updateSubscription(id: string, patch: Partial<Omit<Subscription, "id" | "createdAt">>): Promise<Subscription>;

  // Denetim
  addAuditLog(input: Omit<AuditLog, "id" | "createdAt">): Promise<void>;
  listAuditLogs(opts: { limit: number; entityId?: string }): Promise<AuditLog[]>;

  // KVKK talepleri
  createPrivacyRequest(input: Omit<PrivacyRequest, "id" | "createdAt" | "status" | "completedAt">): Promise<PrivacyRequest>;
  listPrivacyRequests(): Promise<PrivacyRequest[]>;
  updatePrivacyRequest(id: string, patch: Partial<Pick<PrivacyRequest, "status" | "completedAt" | "profileId">>): Promise<PrivacyRequest>;

  // SEO ve ayarlar
  listSeoPages(): Promise<SeoPage[]>;
  getSeoPage(path: string): Promise<SeoPage | null>;
  upsertSeoPage(input: Omit<SeoPage, "id" | "updatedAt">): Promise<SeoPage>;
  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;

  // İstatistik
  recordProfileView(profileId: string, day: string): Promise<void>;
  getDailyViews(days: number, profileId?: string): Promise<DailyViews[]>;
  getDashboardCounts(now: Date): Promise<DashboardCounts>;

  // Yöneticiler
  getAdmin(id: string): Promise<Admin | null>;
  getAdminByEmail(email: string): Promise<Admin | null>;
}
