import "server-only";
import type { ProfileFilters } from "@/domain/filters";
import { getProvince } from "@/domain/locations";
import { toPublicProfile } from "@/domain/projection";
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

function project(p: Profile, now: Date): PublicProfile | null {
  const s = store();
  const subs = s.subscriptions.filter((x) => x.profileId === p.id && effectiveStatus(x, now) === "active");
  const sub = subs.sort((a, b) => b.endsAt.localeCompare(a.endsAt))[0];
  return toPublicProfile({
    profile: p,
    media: s.media.filter((i) => i.profileId === p.id),
    interests: s.interests,
    verifications: s.verifications.filter((v) => v.profileId === p.id),
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
  return b.publishedAt.localeCompare(a.publishedAt);
}

export function createMemoryRepository(): Repository {
  return {
    kind: "memory",

    async searchPublicProfiles(filters: ProfileFilters, { limit, offset }) {
      const now = new Date();
      const province = filters.il ? getProvince(filters.il) : undefined;
      if (filters.il && !province) return { items: [], total: 0 };
      const items = publishedProjections(now)
        .filter((p) => !province || p.province.plate === province.plate)
        .filter((p) => !filters.ilce || p.district?.slug === filters.ilce)
        .filter((p) => filters.yasMin === undefined || p.age >= filters.yasMin)
        .filter((p) => filters.yasMax === undefined || p.age <= filters.yasMax)
        .filter((p) => filters.ilgi.every((slug) => p.interests.some((i) => i.slug === slug)))
        .filter((p) => !filters.dogrulanmis || p.verified)
        .sort(sortListing);
      return { items: clone(items.slice(offset, offset + limit)), total: items.length };
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
          (r) => (!filter?.status || r.status === filter.status) && (!filter?.profileId || r.profileId === filter.profileId),
        ),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getReport(id) {
      return clone(store().reports.find((r) => r.id === id) ?? null);
    },
    async createReport(input) {
      const now = new Date().toISOString();
      const row = { ...input, id: nextId("rep"), status: "open" as const, resolution: null, createdAt: now, updatedAt: now };
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
    async countRecentModerationActions(type, sinceIso) {
      return store().actions.filter((a) => a.type === type && a.createdAt >= sinceIso).length;
    },
    async countRecentReportsByHash(hash, sinceIso) {
      return store().reports.filter((r) => r.reporterHash === hash && r.createdAt >= sinceIso).length;
    },
    async listModerationActions(filter) {
      return clone(
        store().actions.filter(
          (a) => (!filter.reportId || a.reportId === filter.reportId) && (!filter.profileId || a.profileId === filter.profileId),
        ),
      ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async addModerationAction(input) {
      const row = { ...input, id: nextId("act"), createdAt: new Date().toISOString() };
      store().actions.push(row);
      return clone(row);
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


