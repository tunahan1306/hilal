import type { CountryCode } from "@/domain/countries";
import type { CountryDecision, CountryPolicy, NewCountryDecision } from "@/domain/country-policy";
import type { CountryFeatureDecision, CountryFeaturePolicy, NewCountryFeatureDecision, PolicyFeature } from "@/domain/policy";
import type { AgeVerificationCheck, AppUser, AppUserStatus, ConsentRecord, NewAgeVerificationCheck, NewConsentRecord, UserRole } from "@/domain/identity";
import type {
  Conversation,
  Follow,
  MediaAsset,
  Message,
  Notification,
  NewPost,
  Post,
  PublicPost,
  PublicUserProfile,
  UserBlock,
  UserProfile,
  UserProfilePatch,
  NewUserProfile,
} from "@/domain/social";
import type {
  ContentRights,
  CreatorAccount,
  CreatorAccountStatus,
  CreatorPayout,
  CreatorSubscription,
  CreatorSubscriptionTier,
  NewContentRights,
  NewCreatorAccount,
  NewCreatorPayout,
  NewCreatorSubscription,
  NewCreatorSubscriptionTier,
} from "@/domain/creator";
import type { LocationData } from "@/domain/location-directory";
import type { ProfileFilters } from "@/domain/filters";
import type { ModerationContentType } from "@/domain/moderation";
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

/**
 * contentType/contentId isteğe bağlıdır: verilmezse repository bunları 'profile'/profileId
 * olarak türetir — admin-küratörlü keşif ürününün mevcut, değişmemiş çağrı şekli
 * (yalnızca profileId verir) böylece kırılmadan content_ref_present kısıtını karşılar.
 * Modül B/C içeriği için profileId null, contentType/contentId açıkça verilir.
 */
export type NewModerationReport = Omit<ModerationReport, "id" | "createdAt" | "updatedAt" | "status" | "resolution" | "contentType" | "contentId"> & {
  contentType?: ModerationContentType;
  contentId?: string;
};
export type NewModerationAction = Omit<ModerationAction, "id" | "createdAt" | "contentType" | "contentId"> & {
  contentType?: ModerationContentType;
  contentId?: string;
};

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

  // Modül G — genelleştirilmiş ülke×özellik politika motoru (country-policy.ts'ten AYRI;
  // yalnızca yeni modüllerin (B/C/F) özelliklerini yönetir, keşif ürününe dokunmaz).
  listCountryFeaturePolicies(): Promise<CountryFeaturePolicy[]>;
  listCountryFeatureDecisions(country?: CountryCode, feature?: PolicyFeature): Promise<CountryFeatureDecision[]>;
  /** Yalnızca eklenir; politika durumu bu kayıttan türetilir. Yetki (sahip rolü) servis katmanında denetlenir. */
  addCountryFeatureDecision(input: NewCountryFeatureDecision): Promise<CountryFeatureDecision>;

  // Modül A — son kullanıcı kimliği (app_users; admins'ten AYRI, farklı güven modeli).
  // id, Supabase modunda auth.users.id ile birebir; memory modunda repository üretir.
  createAppUser(input: { id: string; email: string }): Promise<AppUser>;
  getAppUserById(id: string): Promise<AppUser | null>;
  getAppUserByEmail(email: string): Promise<AppUser | null>;
  markAppUserEmailVerified(id: string, verifiedAt: string): Promise<void>;
  addConsentRecord(input: NewConsentRecord): Promise<ConsentRecord>;
  listConsentRecords(userId: string): Promise<ConsentRecord[]>;
  /** Yalnızca sağlayıcı entegrasyonunun sonucunu kaydeder; ham belge/biyometrik veri asla geçmez. */
  addAgeVerificationCheck(input: NewAgeVerificationCheck): Promise<AgeVerificationCheck>;
  listAgeVerificationChecks(userId: string): Promise<AgeVerificationCheck[]>;

  // Modül B — sosyal platform (user_profiles; admin-küratörlü profiles'tan AYRI).
  createUserProfile(input: NewUserProfile): Promise<UserProfile>;
  getUserProfileByUserId(userId: string): Promise<UserProfile | null>;
  getUserProfileByHandle(handle: string): Promise<UserProfile | null>;
  /** Modül E — content_type='user_profile' şikâyetinin hedefini çözmek için (contentId, user_profiles.id'dir, userId değil). */
  getUserProfileById(id: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, patch: UserProfilePatch): Promise<UserProfile>;
  /** user_profiles_public view'ı üzerinden — fail-closed politika+yaş doğrulama kapısı burada uygulanır. */
  getPublicUserProfile(userId: string): Promise<PublicUserProfile | null>;

  addFollow(followerId: string, followeeId: string): Promise<Follow>;
  removeFollow(followerId: string, followeeId: string): Promise<void>;
  listFollowing(userId: string): Promise<string[]>;
  listFollowers(userId: string): Promise<string[]>;

  addBlock(blockerId: string, blockedId: string): Promise<UserBlock>;
  removeBlock(blockerId: string, blockedId: string): Promise<void>;
  /** Her iki yönde de — isBlockedEitherWay ile birlikte kullanılır. */
  listBlocksInvolving(userId: string): Promise<UserBlock[]>;

  /** 1:1 konuşma — ikili zaten varsa onu döndürür, yoksa oluşturur. */
  startOrGetConversation(userA: string, userB: string): Promise<Conversation>;
  listConversationParticipants(conversationId: string): Promise<string[]>;
  addMessage(input: { conversationId: string; senderId: string; body: string }): Promise<Message>;
  listMessages(conversationId: string, opts: { limit: number }): Promise<Message[]>;
  /** Modül E — content_type='message' şikâyetinin hedefini çözmek için. */
  getMessageById(id: string): Promise<Message | null>;

  addNotification(input: { userId: string; type: Notification["type"]; payload: Record<string, unknown> }): Promise<Notification>;
  listNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: string, userId: string): Promise<void>;

  // Modül B kapanışı — posts/media_assets (Modül C'nin content_rights'ıyla birlikte;
  // bkz. 20261027000004_creator_platform.sql yorumu).
  /** data zaten işlenmiş (EXIF temizlenmiş, yeniden kodlanmış) bayt dizisidir; depolama yazımı burada yapılır. */
  createMediaAsset(input: { ownerId: string; data: Buffer; contentType: string; kind: MediaAsset["kind"]; width: number | null; height: number | null; durationSeconds: number | null }): Promise<MediaAsset>;
  getMediaAsset(id: string): Promise<MediaAsset | null>;
  listMediaAssetsByOwner(ownerId: string): Promise<MediaAsset[]>;

  createPost(input: NewPost): Promise<Post>;
  getPost(id: string): Promise<Post | null>;
  listPostsByAuthor(authorId: string): Promise<Post[]>;
  listPostMediaIds(postId: string): Promise<string[]>;
  /** posts_public view ile birebir — yalnızca uygun ve (ücretliyse) tüm ekleri incelenmiş gönderiler. */
  listPublicPostsByAuthor(authorId: string): Promise<PublicPost[]>;

  // Modül C — creator platform
  createCreatorAccount(input: NewCreatorAccount): Promise<CreatorAccount>;
  getCreatorAccountByUserId(userId: string): Promise<CreatorAccount | null>;
  getCreatorAccountById(id: string): Promise<CreatorAccount | null>;
  listCreatorAccounts(filter?: { status?: CreatorAccountStatus }): Promise<CreatorAccount[]>;
  /** Yalnızca onay/askıya alma geçişi; creator rolü senkronu veritabanı tetikleyicisinde (bkz. migration). */
  updateCreatorAccountStatus(id: string, status: CreatorAccountStatus, actor: { approvedBy: string | null; approvedAt: string | null }): Promise<CreatorAccount>;

  addUserRole(userId: string, role: UserRole): Promise<void>;
  listUserRoles(userId: string): Promise<UserRole[]>;

  addContentRights(input: NewContentRights): Promise<ContentRights>;
  getContentRightsByMediaAsset(mediaAssetId: string): Promise<ContentRights | null>;
  listContentRightsForMediaAssets(mediaAssetIds: string[]): Promise<ContentRights[]>;
  reviewContentRights(id: string, reviewedBy: string, reviewedAt: string): Promise<ContentRights>;

  createSubscriptionTier(input: NewCreatorSubscriptionTier): Promise<CreatorSubscriptionTier>;
  listSubscriptionTiersByCreator(creatorId: string): Promise<CreatorSubscriptionTier[]>;
  getSubscriptionTier(id: string): Promise<CreatorSubscriptionTier | null>;

  /** Gerçek satın alma yolu yok (bkz. domain/creator.ts yorumu) — yalnızca test/Modül F hazırlığı için. */
  addCreatorSubscription(input: NewCreatorSubscription): Promise<CreatorSubscription>;
  listCreatorSubscriptionsBySubscriber(subscriberId: string): Promise<CreatorSubscription[]>;
  getActiveSubscription(subscriberId: string, tierId: string): Promise<CreatorSubscription | null>;

  /** Modül F'in gerçek payout akışına kadar yalnızca test amaçlı — hiçbir Server Action çağırmaz. */
  addCreatorPayout(input: NewCreatorPayout): Promise<CreatorPayout>;
  listCreatorPayouts(creatorId: string): Promise<CreatorPayout[]>;

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

  // Moderasyon (Modül E — genelleştirildi; content_type='profile' admin-küratörlü ürün için değişmedi)
  listReports(filter?: { status?: ModerationReport["status"]; profileId?: string; contentType?: ModerationContentType; contentId?: string }): Promise<ModerationReport[]>;
  getReport(id: string): Promise<ModerationReport | null>;
  createReport(input: NewModerationReport): Promise<ModerationReport>;
  updateReport(id: string, patch: Partial<Pick<ModerationReport, "status" | "resolution">>): Promise<ModerationReport>;
  countRecentReportsByHash(hash: string, sinceIso: string): Promise<number>;
  countRecentReportsForProfile(profileId: string, sinceIso: string): Promise<number>;
  /** Modül B/C içeriği için — countRecentReportsForProfile'ın genelleştirilmiş eşdeğeri. */
  countRecentReportsForContent(contentType: ModerationContentType, contentId: string, sinceIso: string): Promise<number>;
  countRecentModerationActions(type: ModerationAction["type"], sinceIso: string): Promise<number>;
  listModerationActions(filter: { reportId?: string; profileId?: string; contentType?: ModerationContentType; contentId?: string }): Promise<ModerationAction[]>;
  addModerationAction(input: NewModerationAction): Promise<ModerationAction>;
  /** user_profiles/posts/media_assets ortak moderation_status sütununu ayarlar — triyaj + (ileride) proaktif onay için tek yazma yolu. */
  setContentModerationStatus(contentType: Extract<ModerationContentType, "user_profile" | "post" | "media_asset" | "message">, contentId: string, status: "approved" | "rejected", reviewedBy: string): Promise<void>;
  /** Modül E — hesap askıya alma triyaj eylemi (app_users.status). */
  updateAppUserStatus(userId: string, status: AppUserStatus, actorId: string | null): Promise<void>;

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
