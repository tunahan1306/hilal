import "server-only";
import type { ProfileFilters } from "@/domain/filters";
import { getProvince, listProvinces, listDistricts } from "@/domain/locations";
import { toPublicProfile } from "@/domain/projection";
import { countryOfPlate, type CountryCode } from "@/domain/countries";
import { defaultPolicies, isPublishable, type CountryPolicy } from "@/domain/country-policy";
import { defaultFeaturePolicies, isFeaturePermitted, type CountryFeaturePolicy, type PolicyFeature } from "@/domain/policy";
import type { AppUser } from "@/domain/identity";
import type { MediaAsset, PublicUserProfile } from "@/domain/social";
import type { ContentRights, CreatorAccount, CreatorSubscriptionTier } from "@/domain/creator";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { sideDistricts } from "@/domain/istanbul";
import { effectiveStatus, isExpiringSoon } from "@/domain/subscriptions";
import type { Profile, PublicProfile } from "@/domain/types";
import { createDemoStore, type DemoStore } from "./demo-seed";
import type { DashboardCounts, Repository } from "./types";

/**
 * Bellek içi repository. Supabase yapılandırılmadığında (yerel geliştirme,
 * testler, demo) kullanılır. Veriler süreç yeniden başlayınca sıfırlanır.
 */
const g = globalThis as unknown as { __hilalDemoStore?: DemoStore };

function store(): DemoStore {
  if (!g.__hilalDemoStore) g.__hilalDemoStore = createDemoStore(new Date());
  return g.__hilalDemoStore;
}

export function resetDemoStore(): void {
  g.__hilalDemoStore = createDemoStore(new Date());
}

function nextId(prefix: string): string {
  const s = store();
  s.counter += 1;
  return `${prefix}-${s.counter.toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function must<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null) throw new Error(`${what} bulunamadı`);
  return v;
}

const clone = <T>(v: T): T => structuredClone(v);

function countryPolicies(): CountryPolicy[] {
  const decisions = store().countryDecisions;
  return defaultPolicies().map((base) => {
    const last = decisions.filter((d) => d.countryCode === base.code).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0];
    return last ? { code: base.code, status: last.status, reviewDue: last.reviewDue, decisionId: last.id } : base;
  });
}

function countryFeaturePolicies(): CountryFeaturePolicy[] {
  const decisions = store().featureDecisions;
  return defaultFeaturePolicies().map((base) => {
    // decidedAt milisaniye çözünürlüğünde olduğundan (iki karar aynı ms içinde eklenebilir),
    // "en son karar" eklenme sırasına göre belirlenir (string sıralamaya göre değil).
    const last = decisions.findLast((d) => d.countryCode === base.countryCode && d.feature === base.feature);
    return last ? { countryCode: base.countryCode, feature: base.feature, status: last.status, reviewDue: last.reviewDue, decisionId: last.id } : base;
  });
}

function project(p: Profile, now: Date): PublicProfile | null {
  const s = store();
  const policies = countryPolicies();
  const phoneShared = Boolean(p.whatsappPhone) && s.profiles.some((o) => o.id !== p.id && o.status === "published" && o.whatsappPhone === p.whatsappPhone);
  const subs = s.subscriptions.filter((x) => x.profileId === p.id && effectiveStatus(x, now) === "active");
  const sub = subs.sort((a, b) => b.endsAt.localeCompare(a.endsAt))[0];
  return toPublicProfile({
    profile: p,
    media: s.media.filter((i) => i.profileId === p.id),
    interests: s.interests,
    verifications: s.verifications.filter((v) => v.profileId === p.id),
    consents: s.consents.filter((c) => c.profileId === p.id),
    countryPublishable: isPublishable(policies.find((x) => x.code === countryOfPlate(p.provincePlate)), now),
    phoneShared,
    subscription: sub,
    plan: sub ? s.plans.find((pl) => pl.id === sub.planId) : s.plans.find((pl) => pl.code === "basic"),
    now,
  });
}

function publishedProjections(now: Date): PublicProfile[] {
  return store()
    .profiles.filter((p) => p.status === "published")
    .map((p) => project(p, now))
    .filter((p): p is PublicProfile => p !== null && p.images.length > 0);
}

function sortListing(a: PublicProfile, b: PublicProfile): number {
  if (a.sponsored !== b.sponsored) return a.sponsored ? -1 : 1;
  return b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id);
}

export function createMemoryRepository(): Repository {
  return {
    kind: "memory",
    async listCountryPolicies() {
      return clone(countryPolicies());
    },
    async listCountryDecisions(country?: CountryCode) {
      return clone(store().countryDecisions.filter((d) => !country || d.countryCode === country).sort((a, b) => b.decidedAt.localeCompare(a.decidedAt)));
    },
    async addCountryDecision(input) {
      const s = store();
      const row = { ...input, id: nextId("cdec"), decidedAt: new Date().toISOString() };
      s.countryDecisions.push(row);
      // Veritabanında bu kaydı apply_country_decision tetikleyicisi yazar.
      s.audit.push({ id: nextId("aud"), actorId: input.decidedBy, action: "country.publication_decision", entityType: "country", entityId: input.countryCode, metadata: { decision_id: row.id, status: row.status, review_due: row.reviewDue, approver_name: row.approverName }, createdAt: row.decidedAt });
      return clone(row);
    },
    async listCountryFeaturePolicies() {
      return clone(countryFeaturePolicies());
    },
    async listCountryFeatureDecisions(country?: CountryCode, feature?: PolicyFeature) {
      return clone(
        store()
          .featureDecisions.filter((d) => (!country || d.countryCode === country) && (!feature || d.feature === feature))
          .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt)),
      );
    },
    async addCountryFeatureDecision(input) {
      const s = store();
      const row = { ...input, id: nextId("fdec"), decidedAt: new Date().toISOString() };
      s.featureDecisions.push(row);
      // Veritabanında bu kaydı apply_country_feature_decision tetikleyicisi yazar.
      s.audit.push({
        id: nextId("aud"),
        actorId: input.decidedBy,
        action: "country_feature.policy_decision",
        entityType: "country_feature_policy",
        entityId: `${input.countryCode}:${input.feature}`,
        metadata: { decision_id: row.id, country_code: row.countryCode, feature_code: row.feature, status: row.status, review_due: row.reviewDue, approver_name: row.approverName },
        createdAt: row.decidedAt,
      });
      return clone(row);
    },
    async createAppUser(input) {
      const s = store();
      const now = new Date().toISOString();
      const row: AppUser = { id: input.id, email: input.email, emailVerifiedAt: null, status: "active", createdAt: now, updatedAt: now };
      s.users.push(row);
      return clone(row);
    },
    async getAppUserById(id) {
      return clone(store().users.find((u) => u.id === id) ?? null);
    },
    async getAppUserByEmail(email) {
      return clone(store().users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null);
    },
    async markAppUserEmailVerified(id, verifiedAt) {
      const u = store().users.find((x) => x.id === id);
      if (u) {
        u.emailVerifiedAt = verifiedAt;
        u.updatedAt = verifiedAt;
      }
    },
    async addConsentRecord(input) {
      const s = store();
      const row = { ...input, id: nextId("cons"), grantedAt: new Date().toISOString(), revokedAt: input.revokedAt ?? null, createdAt: new Date().toISOString() };
      s.consentRecords.push(row);
      return clone(row);
    },
    async listConsentRecords(userId) {
      return clone(store().consentRecords.filter((c) => c.userId === userId));
    },
    async addAgeVerificationCheck(input) {
      const s = store();
      const row = { ...input, id: nextId("avc"), createdAt: new Date().toISOString() };
      s.ageVerificationChecks.push(row);
      return clone(row);
    },
    async listAgeVerificationChecks(userId) {
      return clone(store().ageVerificationChecks.filter((c) => c.userId === userId));
    },
    async createUserProfile(input) {
      const s = store();
      const now = new Date().toISOString();
      const row = { ...input, id: nextId("uprof"), moderationStatus: "pending" as const, createdAt: now, updatedAt: now };
      s.userProfiles.push(row);
      return clone(row);
    },
    async getUserProfileByUserId(userId) {
      return clone(store().userProfiles.find((p) => p.userId === userId) ?? null);
    },
    async getUserProfileByHandle(handle) {
      return clone(store().userProfiles.find((p) => p.handle.toLowerCase() === handle.toLowerCase()) ?? null);
    },
    async getUserProfileById(id) {
      return clone(store().userProfiles.find((p) => p.id === id) ?? null);
    },
    async updateUserProfile(userId, patch) {
      const p = must(
        store().userProfiles.find((x) => x.userId === userId),
        "Profil",
      );
      Object.assign(p, patch, { updatedAt: new Date().toISOString() });
      return clone(p);
    },
    async getPublicUserProfile(userId): Promise<PublicUserProfile | null> {
      const s = store();
      const p = s.userProfiles.find((x) => x.userId === userId);
      if (!p || p.moderationStatus !== "approved" || p.visibility !== "public") return null;
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.2425 * 86_400_000));
      if (age < 18) return null;
      const policy = countryFeaturePolicies().find((x) => x.countryCode === p.countryCode && x.feature === "social_profiles");
      if (!isFeaturePermitted(policy)) return null;
      const now = new Date();
      const verified = s.ageVerificationChecks.some(
        (v) => v.userId === userId && v.status === "approved" && (!v.expiresAt || new Date(v.expiresAt) >= now),
      );
      if (!verified) return null;
      return clone({ id: p.id, userId: p.userId, handle: p.handle, displayName: p.displayName, bio: p.bio, age, countryCode: p.countryCode, createdAt: p.createdAt });
    },
    async addFollow(followerId, followeeId) {
      const s = store();
      const row = { followerId, followeeId, createdAt: new Date().toISOString() };
      s.follows.push(row);
      return clone(row);
    },
    async removeFollow(followerId, followeeId) {
      const s = store();
      s.follows = s.follows.filter((f) => !(f.followerId === followerId && f.followeeId === followeeId));
    },
    async listFollowing(userId) {
      return store()
        .follows.filter((f) => f.followerId === userId)
        .map((f) => f.followeeId);
    },
    async listFollowers(userId) {
      return store()
        .follows.filter((f) => f.followeeId === userId)
        .map((f) => f.followerId);
    },
    async addBlock(blockerId, blockedId) {
      const s = store();
      const row = { blockerId, blockedId, createdAt: new Date().toISOString() };
      s.userBlocks.push(row);
      return clone(row);
    },
    async removeBlock(blockerId, blockedId) {
      const s = store();
      s.userBlocks = s.userBlocks.filter((b) => !(b.blockerId === blockerId && b.blockedId === blockedId));
    },
    async listBlocksInvolving(userId) {
      return clone(store().userBlocks.filter((b) => b.blockerId === userId || b.blockedId === userId));
    },
    async startOrGetConversation(userA, userB) {
      const s = store();
      const existing = s.conversations.find((c) => {
        const participants = s.conversationParticipants.filter((p) => p.conversationId === c.id).map((p) => p.userId);
        return participants.length === 2 && participants.includes(userA) && participants.includes(userB);
      });
      if (existing) return clone(existing);
      const now = new Date().toISOString();
      const conversation = { id: nextId("conv"), createdAt: now };
      s.conversations.push(conversation);
      s.conversationParticipants.push(
        { conversationId: conversation.id, userId: userA, joinedAt: now, lastReadAt: null },
        { conversationId: conversation.id, userId: userB, joinedAt: now, lastReadAt: null },
      );
      return clone(conversation);
    },
    async listConversationParticipants(conversationId) {
      return store()
        .conversationParticipants.filter((p) => p.conversationId === conversationId)
        .map((p) => p.userId);
    },
    async addMessage(input) {
      const s = store();
      const row = { ...input, id: nextId("msg"), createdAt: new Date().toISOString(), deletedAt: null, moderationStatus: "approved" as const };
      s.messages.push(row);
      return clone(row);
    },
    async listMessages(conversationId, { limit }) {
      return clone(
        store()
          .messages.filter((m) => m.conversationId === conversationId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(-limit),
      );
    },
    async getMessageById(id) {
      return clone(store().messages.find((m) => m.id === id) ?? null);
    },
    async addNotification(input) {
      const s = store();
      const row = { ...input, id: nextId("notif"), readAt: null, createdAt: new Date().toISOString() };
      s.notifications.push(row);
      return clone(row);
    },
    async listNotifications(userId) {
      return clone(
        store()
          .notifications.filter((n) => n.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    async markNotificationRead(id, userId) {
      const n = store().notifications.find((x) => x.id === id && x.userId === userId);
      if (n) n.readAt = new Date().toISOString();
    },
    async createMediaAsset(input) {
      const s = store();
      const id = nextId("media");
      const path = `user-media/${input.ownerId}/${id}.webp`;
      s.privateFiles.set(path, { data: input.data, contentType: input.contentType });
      const row: MediaAsset = {
        id,
        ownerId: input.ownerId,
        storagePath: path,
        url: `/${path}`,
        kind: input.kind,
        width: input.width,
        height: input.height,
        durationSeconds: input.durationSeconds,
        status: "ready",
        rightsConfirmed: false,
        moderationStatus: "pending",
        createdAt: new Date().toISOString(),
      };
      s.mediaAssets.push(row);
      return clone(row);
    },
    async getMediaAsset(id) {
      return clone(store().mediaAssets.find((m) => m.id === id) ?? null);
    },
    async listMediaAssetsByOwner(ownerId) {
      return clone(store().mediaAssets.filter((m) => m.ownerId === ownerId));
    },
    async createPost(input) {
      const s = store();
      const now = new Date().toISOString();
      const row = { id: nextId("post"), authorId: input.authorId, body: input.body, visibility: input.visibility, paid: input.paid, moderationStatus: "pending" as const, createdAt: now, updatedAt: now };
      s.posts.push(row);
      for (const mediaAssetId of input.mediaAssetIds) s.postMedia.push({ postId: row.id, mediaAssetId });
      return clone(row);
    },
    async getPost(id) {
      return clone(store().posts.find((p) => p.id === id) ?? null);
    },
    async listPostsByAuthor(authorId) {
      return clone(
        store()
          .posts.filter((p) => p.authorId === authorId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    async listPostMediaIds(postId) {
      return store()
        .postMedia.filter((pm) => pm.postId === postId)
        .map((pm) => pm.mediaAssetId);
    },
    async listPublicPostsByAuthor(authorId) {
      const s = store();
      const profile = s.userProfiles.find((p) => p.userId === authorId);
      if (!profile || profile.moderationStatus !== "approved") return [];
      const policy = countryFeaturePolicies().find((x) => x.countryCode === profile.countryCode && x.feature === "digital_content");
      if (!isFeaturePermitted(policy)) return [];
      const rightsReviewed = (mediaAssetId: string) => s.contentRights.some((r) => r.mediaAssetId === mediaAssetId && r.reviewedAt !== null);
      return clone(
        s.posts
          .filter((p) => p.authorId === authorId && p.moderationStatus === "approved" && p.visibility === "public")
          .filter((p) => {
            if (!p.paid) return true;
            const mediaIds = s.postMedia.filter((pm) => pm.postId === p.id).map((pm) => pm.mediaAssetId);
            return mediaIds.every(rightsReviewed);
          })
          .map((p) => ({ id: p.id, authorId: p.authorId, body: p.body, paid: p.paid, createdAt: p.createdAt }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    },
    async createCreatorAccount(input) {
      const s = store();
      const row: CreatorAccount = { id: nextId("creator"), userId: input.userId, legalName: input.legalName, countryCode: input.countryCode, status: "pending", approvedBy: null, approvedAt: null, createdAt: new Date().toISOString() };
      s.creatorAccounts.push(row);
      return clone(row);
    },
    async getCreatorAccountByUserId(userId) {
      return clone(store().creatorAccounts.find((c) => c.userId === userId) ?? null);
    },
    async getCreatorAccountById(id) {
      return clone(store().creatorAccounts.find((c) => c.id === id) ?? null);
    },
    async listCreatorAccounts(filter) {
      return clone(store().creatorAccounts.filter((c) => !filter?.status || c.status === filter.status));
    },
    async updateCreatorAccountStatus(id, status, actor) {
      const c = must(
        store().creatorAccounts.find((x) => x.id === id),
        "Creator hesabı",
      );
      c.status = status;
      c.approvedBy = actor.approvedBy;
      c.approvedAt = actor.approvedAt;
      // Veritabanında bu satırı creator_accounts_sync_role tetikleyicisi yazar.
      if (status === "active") store().userRoles.push({ userId: c.userId, role: "creator" });
      return clone(c);
    },
    async addUserRole(userId, role) {
      const s = store();
      if (!s.userRoles.some((r) => r.userId === userId && r.role === role)) s.userRoles.push({ userId, role });
    },
    async listUserRoles(userId) {
      return store()
        .userRoles.filter((r) => r.userId === userId)
        .map((r) => r.role);
    },
    async addContentRights(input) {
      const s = store();
      const row: ContentRights = { id: nextId("rights"), mediaAssetId: input.mediaAssetId, rightsType: input.rightsType, evidencePath: input.evidencePath, confirmedAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null };
      s.contentRights.push(row);
      return clone(row);
    },
    async getContentRightsByMediaAsset(mediaAssetId) {
      return clone(store().contentRights.find((r) => r.mediaAssetId === mediaAssetId) ?? null);
    },
    async listContentRightsForMediaAssets(mediaAssetIds) {
      return clone(store().contentRights.filter((r) => mediaAssetIds.includes(r.mediaAssetId)));
    },
    async reviewContentRights(id, reviewedBy, reviewedAt) {
      const r = must(
        store().contentRights.find((x) => x.id === id),
        "Hak kaydı",
      );
      r.reviewedBy = reviewedBy;
      r.reviewedAt = reviewedAt;
      return clone(r);
    },
    async createSubscriptionTier(input) {
      const s = store();
      const row: CreatorSubscriptionTier = { id: nextId("tier"), creatorId: input.creatorId, name: input.name, priceAmount: input.priceAmount, priceCurrency: input.priceCurrency, description: input.description, active: true, createdAt: new Date().toISOString() };
      s.creatorSubscriptionTiers.push(row);
      return clone(row);
    },
    async listSubscriptionTiersByCreator(creatorId) {
      return clone(store().creatorSubscriptionTiers.filter((t) => t.creatorId === creatorId));
    },
    async getSubscriptionTier(id) {
      return clone(store().creatorSubscriptionTiers.find((t) => t.id === id) ?? null);
    },
    async addCreatorSubscription(input) {
      const s = store();
      const row = { ...input, id: nextId("csub"), createdAt: new Date().toISOString() };
      s.creatorSubscriptions.push(row);
      return clone(row);
    },
    async listCreatorSubscriptionsBySubscriber(subscriberId) {
      return clone(store().creatorSubscriptions.filter((x) => x.subscriberId === subscriberId));
    },
    async getActiveSubscription(subscriberId, tierId) {
      return clone(store().creatorSubscriptions.find((x) => x.subscriberId === subscriberId && x.tierId === tierId && x.status === "active") ?? null);
    },
    async addCreatorPayout(input) {
      const s = store();
      const row = { ...input, id: nextId("payout"), createdAt: new Date().toISOString() };
      s.creatorPayouts.push(row);
      return clone(row);
    },
    async listCreatorPayouts(creatorId) {
      return clone(store().creatorPayouts.filter((p) => p.creatorId === creatorId));
    },
    async addPaymentTransaction(input) {
      const s = store();
      if (s.paymentTransactions.some((t) => t.idempotencyKey === input.idempotencyKey)) {
        throw new Error("addPaymentTransaction: idempotencyKey zaten kullanılmış");
      }
      const row = { ...input, id: nextId("txn"), createdAt: new Date().toISOString() };
      s.paymentTransactions.push(row);
      return clone(row);
    },
    async getPaymentTransactionByIdempotencyKey(key) {
      return clone(store().paymentTransactions.find((t) => t.idempotencyKey === key) ?? null);
    },
    async listPaymentTransactions(filter) {
      return clone(
        store().paymentTransactions.filter(
          (t) =>
            (!filter?.payerId || t.payerId === filter.payerId) &&
            (!filter?.payeeCreatorId || t.payeeCreatorId === filter.payeeCreatorId) &&
            (!filter?.kind || t.kind === filter.kind),
        ),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async recordWebhookEvent(input) {
      const s = store();
      const existing = s.webhookEvents.find((e) => e.providerName === input.providerName && e.externalEventId === input.externalEventId);
      if (existing) return { event: clone(existing), isNew: false };
      const row = { ...input, id: nextId("whe"), processedAt: null, createdAt: new Date().toISOString() };
      s.webhookEvents.push(row);
      return { event: clone(row), isNew: true };
    },
    async markWebhookEventProcessed(id, processedAt) {
      const e = must(
        store().webhookEvents.find((x) => x.id === id),
        "Webhook olayı",
      );
      e.processedAt = processedAt;
    },
    async getLocations() { const provinces = listProvinces(); return { provinces, districts: provinces.flatMap((p) => listDistricts(p.plate)) }; },

    async searchPublicProfiles(filters: ProfileFilters, { limit, offset, cursor }) {
      const now = new Date();
      const province = filters.il ? getProvince(filters.il) : undefined;
      if (filters.il && !province) return { items: [], total: 0 };
      const side = sideDistricts(filters);
      const items = publishedProjections(now)
        .filter((p) => !province || p.province.plate === province.plate)
        .filter((p) => province || !filters.ulke || countryOfPlate(p.province.plate) === filters.ulke)
        .filter((p) => !filters.ilce || p.district?.slug === filters.ilce)
        .filter((p) => !side || (p.district !== null && side.includes(p.district.slug)))
        .filter((p) => filters.yasMin === undefined || p.age >= filters.yasMin)
        .filter((p) => filters.yasMax === undefined || p.age <= filters.yasMax)
        .filter((p) => filters.ilgi.every((slug) => p.interests.some((i) => i.slug === slug)))
        .filter((p) => !filters.dogrulanmis || p.verified)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id));
      const remaining = cursor ? items.filter((p) => p.publishedAt < cursor.publishedAt || (p.publishedAt === cursor.publishedAt && p.id < cursor.id)) : items;
      return { items: clone(remaining.slice(offset, offset + limit)), total: items.length };
    },

    async getPublicProfile(slug) {
      const p = store().profiles.find((x) => x.slug === slug);
      if (!p) return null;
      const pub = project(p, new Date());
      return pub && pub.images.length > 0 ? clone(pub) : null;
    },

    async listFeaturedProfiles(limit) {
      const all = publishedProjections(new Date()).sort(sortListing);
      return clone(all.slice(0, limit));
    },

    async countPublishedByLocation() {
      const counts = new Map<string, { plate: number; districtSlug: string | null; count: number }>();
      for (const p of publishedProjections(new Date())) {
        for (const key of [`${p.province.plate}|`, p.district ? `${p.province.plate}|${p.district.slug}` : null]) {
          if (!key) continue;
          const [plate, d] = key.split("|");
          const cur = counts.get(key) ?? { plate: Number(plate), districtSlug: d || null, count: 0 };
          cur.count += 1;
          counts.set(key, cur);
        }
      }
      return [...counts.values()];
    },

    async listPublicProfileSlugs() {
      return publishedProjections(new Date()).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
    },

    async listInterests() {
      return clone(store().interests).sort((a, b) => a.name.localeCompare(b.name, "tr"));
    },
    async createInterest(input) {
      const s = store();
      if (s.interests.some((i) => i.slug === input.slug)) throw new Error("Bu ilgi alanı zaten mevcut");
      const row = { id: nextId("int"), ...input };
      s.interests.push(row);
      return clone(row);
    },
    async deleteInterest(id) {
      const s = store();
      s.interests = s.interests.filter((i) => i.id !== id);
      for (const p of s.profiles) p.interestIds = p.interestIds.filter((x) => x !== id);
    },

    async listProfiles() {
      return clone(store().profiles).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getProfile(id) {
      return clone(store().profiles.find((p) => p.id === id) ?? null);
    },
    async getProfileBySlug(slug) {
      return clone(store().profiles.find((p) => p.slug === slug) ?? null);
    },
    async createProfile(input) {
      const s = store();
      if (s.profiles.some((p) => p.slug === input.slug)) throw new Error("Bu slug kullanımda");
      const now = new Date().toISOString();
      const row: Profile = {
        ...input,
        id: nextId("prf"),
        moderationNote: null,
        moderatedBy: null,
        moderatedAt: null,
        publishedAt: null,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      s.profiles.push(row);
      return clone(row);
    },
    async updateProfile(id, patch) {
      const p = must(store().profiles.find((x) => x.id === id), "Profil");
      Object.assign(p, patch, { updatedAt: new Date().toISOString() });
      return clone(p);
    },
    async deleteProfile(id) {
      const s = store();
      s.profiles = s.profiles.filter((p) => p.id !== id);
      s.media = s.media.filter((i) => i.profileId !== id);
      s.consents = s.consents.filter((c) => c.profileId !== id);
      s.verifications = s.verifications.filter((v) => v.profileId !== id);
      s.subscriptions = s.subscriptions.filter((x) => x.profileId !== id);
      for (const k of [...s.views.keys()]) if (k.startsWith(`${id}|`)) s.views.delete(k);
    },

    async listMedia(profileId) {
      return clone(store().media.filter((m) => m.profileId === profileId)).sort((a, b) => a.position - b.position);
    },
    async listAllMedia(filter) {
      return clone(store().media.filter((m) => (!filter?.moderation || m.moderation === filter.moderation) && (!filter?.kind || m.kind === filter.kind))).sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt),
      );
    },
    async listAllConsents() {
      return clone(store().consents);
    },
    async listAllVerifications() {
      return clone(store().verifications);
    },
    async getMedia(id) {
      return clone(store().media.find((m) => m.id === id) ?? null);
    },
    async addMedia(input) {
      const row = { ...input, id: nextId("med"), createdAt: new Date().toISOString() };
      store().media.push(row);
      return clone(row);
    },
    async updateMedia(id, patch) {
      const m = must(store().media.find((x) => x.id === id), "Medya");
      Object.assign(m, patch);
      return clone(m);
    },
    async deleteMedia(id) {
      const s = store();
      const m = s.media.find((x) => x.id === id) ?? null;
      s.media = s.media.filter((x) => x.id !== id);
      return clone(m);
    },
    async storePrivateDocument(path, data, contentType) {
      store().privateFiles.set(path, { data, contentType });
    },
    async removePrivateDocument(path) {
      store().privateFiles.delete(path);
    },

    async listConsents(profileId) {
      return clone(store().consents.filter((c) => c.profileId === profileId));
    },
    async addConsent(input) {
      const row = { ...input, id: nextId("cns"), revokedAt: null };
      store().consents.push(row);
      return clone(row);
    },
    async revokeConsent(id, at) {
      const c = must(store().consents.find((x) => x.id === id), "Rıza kaydı");
      c.revokedAt = at;
      return clone(c);
    },

    async listVerifications(profileId) {
      return clone(store().verifications.filter((v) => v.profileId === profileId));
    },
    async addVerification(input) {
      const row = { ...input, id: nextId("ver"), createdAt: new Date().toISOString() };
      store().verifications.push(row);
      return clone(row);
    },
    async listExpiredVerificationDocuments(now) {
      return clone(store().verifications.filter((v) => v.documentPath && v.retainUntil && v.retainUntil <= now));
    },
    async clearVerificationDocument(id) {
      const v = must(store().verifications.find((x) => x.id === id), "Doğrulama");
      v.documentPath = null;
    },

    async listReports(filter) {
      return clone(
        store().reports.filter(
          (r) =>
            (!filter?.status || r.status === filter.status) &&
            (!filter?.profileId || r.profileId === filter.profileId) &&
            (!filter?.contentType || r.contentType === filter.contentType) &&
            (!filter?.contentId || r.contentId === filter.contentId),
        ),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getReport(id) {
      return clone(store().reports.find((r) => r.id === id) ?? null);
    },
    async createReport(input) {
      const now = new Date().toISOString();
      // Admin-küratörlü ürünün mevcut çağrı şekli (yalnızca profileId) burada 'profile'/profileId'ye
      // türetilir — enforce_moderation_content_ref() tetikleyicisiyle aynı garanti, uygulama katmanında.
      const contentType = input.contentType ?? "profile";
      const contentId = input.contentId ?? input.profileId;
      if (!contentId) throw new Error("createReport: contentId veya profileId gerekli");
      const row = { ...input, contentType, contentId, id: nextId("rep"), status: "open" as const, resolution: null, createdAt: now, updatedAt: now };
      store().reports.push(row);
      return clone(row);
    },
    async updateReport(id, patch) {
      const r = must(store().reports.find((x) => x.id === id), "Şikâyet");
      Object.assign(r, patch, { updatedAt: new Date().toISOString() });
      return clone(r);
    },
    async countRecentReportsForProfile(profileId, sinceIso) {
      return store().reports.filter((r) => r.profileId === profileId && r.createdAt >= sinceIso).length;
    },
    async countRecentReportsForContent(contentType, contentId, sinceIso) {
      return store().reports.filter((r) => r.contentType === contentType && r.contentId === contentId && r.createdAt >= sinceIso).length;
    },
    async countRecentModerationActions(type, sinceIso) {
      return store().actions.filter((a) => a.type === type && a.createdAt >= sinceIso).length;
    },
    async countRecentReportsByHash(hash, sinceIso) {
      return store().reports.filter((r) => r.reporterHash === hash && r.createdAt >= sinceIso).length;
    },
    async listModerationActions(filter) {
      return clone(
        store().actions.filter(
          (a) =>
            (!filter.reportId || a.reportId === filter.reportId) &&
            (!filter.profileId || a.profileId === filter.profileId) &&
            (!filter.contentType || a.contentType === filter.contentType) &&
            (!filter.contentId || a.contentId === filter.contentId),
        ),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async addModerationAction(input) {
      const contentType = input.contentType ?? "profile";
      const contentId = input.contentId ?? input.profileId;
      if (!contentId) throw new Error("addModerationAction: contentId veya profileId gerekli");
      const row = { ...input, contentType, contentId, id: nextId("act"), createdAt: new Date().toISOString() };
      store().actions.push(row);
      return clone(row);
    },
    async setContentModerationStatus(contentType, contentId, status) {
      const s = store();
      if (contentType === "user_profile") {
        const p = must(s.userProfiles.find((x) => x.id === contentId), "Profil");
        p.moderationStatus = status;
      } else if (contentType === "post") {
        const p = must(s.posts.find((x) => x.id === contentId), "Gönderi");
        p.moderationStatus = status;
      } else if (contentType === "media_asset") {
        const m = must(s.mediaAssets.find((x) => x.id === contentId), "Medya");
        m.moderationStatus = status;
      } else if (contentType === "message") {
        const m = must(s.messages.find((x) => x.id === contentId), "Mesaj");
        m.moderationStatus = status;
      }
    },
    async updateAppUserStatus(userId, status) {
      const u = must(store().users.find((x) => x.id === userId), "Kullanıcı");
      u.status = status;
      u.updatedAt = new Date().toISOString();
    },

    async listPlans() {
      return clone(store().plans);
    },
    async listSubscriptions(filter) {
      return clone(store().subscriptions.filter((x) => !filter?.profileId || x.profileId === filter.profileId)).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    },
    async getSubscription(id) {
      return clone(store().subscriptions.find((x) => x.id === id) ?? null);
    },
    async createSubscription(input) {
      const row = { ...input, id: nextId("sub"), cancelledAt: null, createdAt: new Date().toISOString() };
      store().subscriptions.push(row);
      return clone(row);
    },
    async updateSubscription(id, patch) {
      const x = must(store().subscriptions.find((s) => s.id === id), "Abonelik");
      Object.assign(x, patch);
      return clone(x);
    },

    async addAuditLog(input) {
      store().audit.push({ ...input, id: nextId("aud"), createdAt: new Date().toISOString() });
    },
    async listAuditLogs({ limit, entityId }) {
      return clone(store().audit.filter((a) => !entityId || a.entityId === entityId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async createPrivacyRequest(input) {
      const row = { ...input, id: nextId("prv"), status: "received" as const, completedAt: null, createdAt: new Date().toISOString() };
      store().privacy.push(row);
      return clone(row);
    },
    async listPrivacyRequests() {
      return clone(store().privacy).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async updatePrivacyRequest(id, patch) {
      const r = must(store().privacy.find((x) => x.id === id), "Talep");
      Object.assign(r, patch);
      return clone(r);
    },

    async isPublishedMediaUrl(url) {
      return publishedProjections(new Date()).some((p) => p.images.some((i) => i.url === url) || (p.videos ?? []).some((v) => v.url === url || v.posterUrl === url));
    },

    async createContactMessage(input) {
      const now = new Date().toISOString();
      const row = { ...input, id: nextId("msg"), status: "new" as const, readAt: null, createdAt: now, updatedAt: now };
      store().contact.push(row);
      return clone(row);
    },
    async countContactMessagesSince(ipHash, sinceIso) {
      return store().contact.filter((m) => m.ipHash === ipHash && m.createdAt >= sinceIso).length;
    },
    async countUnreadContactMessages() {
      return store().contact.filter((m) => m.readAt === null && m.status !== "spam").length;
    },
    async listContactMessages(filter = {}) {
      return clone(store().contact)
        .filter((m) => (!filter.status || m.status === filter.status) && (!filter.category || m.category === filter.category) && (!filter.unread || m.readAt === null))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    },
    async deleteContactMessage(id) {
      const s = store();
      s.contact = s.contact.filter((m) => m.id !== id);
    },
    async deleteContactMessagesBefore(statuses, beforeIso) {
      const s = store();
      const before = s.contact.length;
      s.contact = s.contact.filter((m) => !(statuses.includes(m.status) && m.updatedAt < beforeIso));
      return before - s.contact.length;
    },
    async getContactMessage(id) {
      const m = store().contact.find((x) => x.id === id);
      return m ? clone(m) : null;
    },
    async updateContactMessage(id, patch) {
      const m = must(store().contact.find((x) => x.id === id), "Mesaj");
      Object.assign(m, patch, { updatedAt: new Date().toISOString() });
      return clone(m);
    },

    async deleteSeoPage(id) {
      const s = store();
      s.seo = s.seo.filter((x) => x.id !== id);
    },
    async listSeoPages() {
      return clone(store().seo).sort((a, b) => a.path.localeCompare(b.path));
    },
    async getSeoPage(path) {
      return clone(store().seo.find((x) => x.path === path) ?? null);
    },
    async upsertSeoPage(input) {
      const s = store();
      const existing = s.seo.find((x) => x.path === input.path);
      const updatedAt = new Date().toISOString();
      if (existing) {
        Object.assign(existing, input, { updatedAt });
        return clone(existing);
      }
      const row = { ...input, id: nextId("seo"), updatedAt };
      s.seo.push(row);
      return clone(row);
    },
    async getSiteSettings() {
      return clone(store().settings);
    },
    async updateSiteSettings(patch) {
      Object.assign(store().settings, patch);
      return clone(store().settings);
    },

    async recordProfileView(profileId, day) {
      const views = store().views;
      const key = `${profileId}|${day}`;
      views.set(key, (views.get(key) ?? 0) + 1);
    },
    async getDailyViews(days, profileId) {
      const now = Date.now();
      const out: { day: string; views: number }[] = [];
      for (let d = days - 1; d >= 0; d--) {
        const day = new Date(now - d * 86_400_000).toISOString().slice(0, 10);
        let total = 0;
        for (const [k, v] of store().views) {
          const [pid, kd] = k.split("|");
          if (kd === day && (!profileId || pid === profileId)) total += v;
        }
        out.push({ day, views: total });
      }
      return out;
    },
    async getDashboardCounts(now): Promise<DashboardCounts> {
      const s = store();
      return {
        totalProfiles: s.profiles.length,
        published: s.profiles.filter((p) => p.status === "published").length,
        drafts: s.profiles.filter((p) => p.status === "draft").length,
        inReview: s.profiles.filter((p) => p.status === "in_review").length,
        openReports: s.reports.filter((r) => r.status === "open" || r.status === "in_review" || r.status === "appealed").length,
        activeSubscriptions: s.subscriptions.filter((x) => effectiveStatus(x, now) === "active").length,
        expiringSoon: s.subscriptions.filter((x) => isExpiringSoon(x, now)).length,
        openPrivacyRequests: s.privacy.filter((r) => r.status === "received" || r.status === "in_progress").length,
        unreadContactMessages: await this.countUnreadContactMessages(),
      };
    },

    async getAdmin(id) {
      return clone(store().admins.find((a) => a.id === id) ?? null);
    },
    async getAdminByEmail(email) {
      return clone(store().admins.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null);
    },
  };
}

// ---------------------------------------------------------------------------
// Modül A — demo modu şifre saklama. Yalnızca Supabase yapılandırılmadığında
// kullanılır (Supabase modunda şifreyi Supabase Auth saklar; bu fonksiyonlar hiç
// çağrılmaz). Admin girişinin demo-credentials.ts'teki tek sabit hesabından farklı
// olarak burada gerçekten çok kullanıcılı, kendi kendine kayıt olunan bir mağaza var.
export function setDemoUserPassword(userId: string, password: string): void {
  store().userCredentials.set(userId, hashPassword(password));
}

export function verifyDemoUserPassword(userId: string, password: string): boolean {
  const stored = store().userCredentials.get(userId);
  return Boolean(stored) && verifyPassword(password, stored!);
}

/** Demo modunda gerçek e-posta gönderilmez; jeton burada tutulur ve doğrulama bununla yapılır. */
export function issueDemoEmailVerificationToken(userId: string): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  store().emailVerificationTokens.set(userId, token);
  return token;
}

export function consumeDemoEmailVerificationToken(userId: string, token: string): boolean {
  const expected = store().emailVerificationTokens.get(userId);
  if (!expected || expected !== token) return false;
  store().emailVerificationTokens.delete(userId);
  return true;
}


