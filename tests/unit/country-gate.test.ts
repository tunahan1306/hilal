import { beforeEach, describe, expect, it } from "vitest";
import { decisionProblems, isPublishable, publishableCountries, type CountryPolicy } from "@/domain/country-policy";
import { parseFilters } from "@/domain/filters";
import type { Admin } from "@/domain/types";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { recordCountryDecision } from "@/server/services/countries";
import { loadPublishContext, publishProfile, updateProfile } from "@/server/services/profiles";

beforeEach(resetDemoStore);

const owner: Admin = { id: "admin-0001", email: "admin@demo.local", displayName: "Demo", role: "owner", mfaEnrolled: true, createdAt: "" };
const moderator: Admin = { ...owner, id: "mod-1", role: "moderator" };
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe("ülke yayın kuralı (saf)", () => {
  const p = (over: Partial<CountryPolicy>): CountryPolicy => ({ code: "nl", status: "permitted", reviewDue: day(10), decisionId: "d", ...over });
  it("varsayılan ve incelenmemiş ülke kapalıdır", () => {
    expect(isPublishable(undefined)).toBe(false);
    expect(isPublishable(p({ status: "not_reviewed" }))).toBe(false);
    expect(isPublishable(p({ status: "prohibited" }))).toBe(false);
  });
  it("izin, geçerli gözden geçirme tarihi ister; tarih geçince kapanır", () => {
    expect(isPublishable(p({}))).toBe(true);
    expect(isPublishable(p({ reviewDue: null }))).toBe(false);
    expect(isPublishable(p({ reviewDue: day(-1) }))).toBe(false);
    expect(publishableCountries([p({}), p({ code: "de", status: "not_reviewed" })])).toEqual(["nl"]);
  });
  it("izin kararı kanıt ve tarih ister", () => {
    expect(decisionProblems({ status: "permitted", approverName: "Av. X", evidenceRef: null, reviewDue: day(30) })).toHaveLength(1);
    expect(decisionProblems({ status: "permitted", approverName: "Av. X", evidenceRef: "REF-1", reviewDue: null })).toHaveLength(1);
    expect(decisionProblems({ status: "permitted", approverName: "Av. X", evidenceRef: "REF-1", reviewDue: day(-2) })).toHaveLength(1);
    expect(decisionProblems({ status: "not_reviewed", approverName: "Av. X", evidenceRef: null, reviewDue: null })).toEqual([]);
  });
});

describe("ülke kapısı (bellek deposu + servis)", () => {
  it("demo: yalnızca Türkiye açıktır; NL/DE incelenmemiştir", async () => {
    const policies = await createMemoryRepository().listCountryPolicies();
    expect(publishableCountries(policies)).toEqual(["tr"]);
  });

  it("onay geri çekilince profiller durum değişmeden kamuya kapanır; sitemap, sayım ve öne çıkanlar da boşalır", async () => {
    const repo = createMemoryRepository();
    const before = await repo.searchPublicProfiles(parseFilters({}), { limit: 100, offset: 0 });
    const published = (await repo.listProfiles()).filter((p) => p.status === "published").length;
    expect(before.total).toBeGreaterThan(0);
    // Daha sıkı kamuya açıklık kuralı demo profillerini düşürmemeli (hepsi doğrulanmış ve rızalı).
    expect(before.total).toBe(published);

    await recordCountryDecision(owner, { countryCode: "tr", status: "not_reviewed", approverName: "Test", evidenceRef: "", reviewDue: "", restrictions: "", note: "geri çekildi", confirm: "tr" });
    expect((await repo.searchPublicProfiles(parseFilters({}), { limit: 100, offset: 0 })).total).toBe(0);
    expect(await repo.listFeaturedProfiles(10)).toEqual([]);
    expect(await repo.listPublicProfileSlugs()).toEqual([]);
    expect(await repo.countPublishedByLocation()).toEqual([]);
    expect(await repo.getPublicProfile(before.items[0]!.slug)).toBeNull();
    expect(await repo.isPublishedMediaUrl(before.items[0]!.images[0]!.url)).toBe(false);
    expect((await repo.listProfiles()).filter((p) => p.status === "published").length).toBe(published);
    const log = await repo.listAuditLogs({ limit: 10, entityId: "tr" });
    expect(log.map((l) => l.action)).toContain("country.publication_decision");
  });

  it("yalnızca sahip karar kaydedebilir; izin kanıt ister; onay için ülke kodu yazılmalı", async () => {
    const ok = { countryCode: "nl" as const, status: "permitted" as const, approverName: "Av. Test", evidenceRef: "REF-NL-1", reviewDue: day(90), restrictions: "", note: "", confirm: "nl" };
    await expect(recordCountryDecision(moderator, ok)).rejects.toThrow(/sahip/);
    await expect(recordCountryDecision(owner, { ...ok, evidenceRef: "" })).rejects.toThrow(/kanıt/);
    await expect(recordCountryDecision(owner, { ...ok, confirm: "de" })).rejects.toThrow(/ülke kodunu/);
    const d = await recordCountryDecision(owner, ok);
    expect(d.decidedBy).toBe(owner.id);
    expect(publishableCountries(await createMemoryRepository().listCountryPolicies())).toEqual(["tr", "nl"]);
  });

  it("kapalı ülkedeki profil yayınlanamaz; yayındaki profil kapalı ülkeye taşınamaz", async () => {
    const repo = createMemoryRepository();
    const target = (await repo.listProfiles()).find((p) => p.status === "published")!;
    await expect(updateProfile(owner, target.id, {
      nickname: target.nickname, birthDate: target.birthDate, provincePlate: 1008, districtSlug: null, bio: target.bio, bioDoc: target.bioDoc!,
      whatsappPhone: "", whatsappConsent: false, interestIds: target.interestIds, seoTitle: null, seoDescription: null, noindex: false,
    })).rejects.toThrow(/yayın kararı olmayan bir ülkeye/);

    const draft = (await repo.listProfiles()).find((p) => p.status !== "published")!;
    await repo.updateProfile(draft.id, { provincePlate: 1008, districtSlug: null });
    const ctx = await loadPublishContext(draft.id);
    expect(ctx.countryPublishable).toBe(false);
    await expect(publishProfile(owner, draft.id)).rejects.toThrow();
  });
});
