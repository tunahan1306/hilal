import type { CountryCode } from "@/domain/countries";
import type { CountryDecision, CountryPolicy, NewCountryDecision } from "@/domain/country-policy";
import type { LocationData } from "@/domain/location-directory";
import type { ProfileFilters } from "@/domain/filters";
import type {
  Admin,
  AuditLog,
  Interest,
  MembershipPlan,
  ModerationAction,
  ModerationReport,
  ContactCategory,
  ContactMessage,
  ContactStatus,
  PrivacyRequest,
  Profile,
  ProfileConsent,
  ProfileMedia,
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
  unreadContactMessages: number;
};

export type DailyViews = { day: string; views: number };

/**
 * Veri erişim sözleşmesi. Uygulama katmanı yalnızca bu arayüzü bilir; Supabase
 * ve bellek içi (demo) uygulamaları birbirinin yerine kullanılabilir.
 */
export interface Repository {
  readonly kind: "supabase" | "memory";
  getLocations(): Promise<LocationData>;

  // Ülke yayın kapısı (kamu okuması: durum; karar kaydı yalnızca yönetim)
  listCountryPolicies(): Promise<CountryPolicy[]>;
  listCountryDecisions(country?: CountryCode): Promise<CountryDecision[]>;
  /** Yalnızca eklenir; ülke durumu bu kayıttan türetilir. Yetki (sahip rolü) servis katmanında denetlenir. */
  addCountryDecision(input: NewCountryDecision): Promise<CountryDecision>;

  // Kamuya açık okuma (yalnızca yayındaki profiller)
  searchPublicProfiles(filters: ProfileFilters, opts: { limit: number; offset: number; cursor?: { publishedAt: string; id: string } }): Promise<SearchResult>;
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

  listMedia(profileId: string): Promise<ProfileMedia[]>;
  /** Toplu okumalar (yönetim listesi ve medya kütüphanesi için N+1 sorgu önlemi) */
  listAllMedia(filter?: { moderation?: ProfileMedia["moderation"]; kind?: ProfileMedia["kind"] }): Promise<ProfileMedia[]>;
  listAllConsents(): Promise<ProfileConsent[]>;
  listAllVerifications(): Promise<VerificationRecord[]>;
  getMedia(id: string): Promise<ProfileMedia | null>;
  addMedia(input: Omit<ProfileMedia, "id" | "createdAt">): Promise<ProfileMedia>;
  updateMedia(id: string, patch: Partial<Omit<ProfileMedia, "id" | "profileId" | "createdAt">>): Promise<ProfileMedia>;
  deleteMedia(id: string): Promise<ProfileMedia | null>;
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
  countRecentReportsForProfile(profileId: string, sinceIso: string): Promise<number>;
  countRecentModerationActions(type: ModerationAction["type"], sinceIso: string): Promise<number>;
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

  /** Instance'lar arası paylaşılan oran sınırı (yalnızca Supabase; bellek deposunda tanımsız). */
  hitRateLimit?(key: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfterSeconds: number }>;
  clearSharedRateLimit?(key: string): Promise<void>;
  purgeRateLimits?(): Promise<number>;

  /** Adres şu anda kamuya açık (yayında + onaylı) bir medyaya mı ait? Görsel vekili için. */
  isPublishedMediaUrl(url: string): Promise<boolean>;

  // İletişim talepleri
  createContactMessage(input: Omit<ContactMessage, "id" | "createdAt" | "updatedAt" | "status" | "readAt">): Promise<ContactMessage>;
  countContactMessagesSince(ipHash: string, sinceIso: string): Promise<number>;
  countUnreadContactMessages(): Promise<number>;
  listContactMessages(filter?: { status?: ContactStatus; category?: ContactCategory; unread?: boolean }): Promise<ContactMessage[]>;
  getContactMessage(id: string): Promise<ContactMessage | null>;
  updateContactMessage(id: string, patch: Partial<Pick<ContactMessage, "status" | "readAt">>): Promise<ContactMessage>;
  deleteContactMessage(id: string): Promise<void>;
  /** Saklama süresi dolan mesajları siler; silinen kayıt sayısını döndürür. */
  deleteContactMessagesBefore(statuses: ContactStatus[], beforeIso: string): Promise<number>;

  // SEO ve ayarlar
  listSeoPages(): Promise<SeoPage[]>;
  getSeoPage(path: string): Promise<SeoPage | null>;
  upsertSeoPage(input: Omit<SeoPage, "id" | "updatedAt">): Promise<SeoPage>;
  deleteSeoPage(id: string): Promise<void>;
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
