import { describe, expect, it } from "vitest";
import { canTransition, evaluatePublishReadiness, type PublishContext } from "@/domain/publishing";
import { canCancel, effectiveStatus, isExpiringSoon, isSponsoredNow, renewalPeriod } from "@/domain/subscriptions";
import type { MembershipPlan, Profile, Subscription } from "@/domain/types";

const now = new Date("2026-10-16T12:00:00Z");

function ctx(over: Partial<PublishContext> = {}, profile: Partial<Profile> = {}): PublishContext {
  return {
    profile: {
      id: "p1", slug: "p1", nickname: "Deniz", birthDate: "1995-01-01", provincePlate: 34, districtSlug: null,
      bioDoc: null, bio: "Kitap kulübü ve yürüyüşleri seviyorum, yeni arkadaşlar arıyorum.", interestIds: [], status: "draft",
      moderationStatus: "approved", moderationNote: null, moderatedBy: null, moderatedAt: null, publishedAt: null,
      archivedAt: null, seoTitle: null, seoDescription: null, noindex: false, createdBy: "a", createdAt: "", updatedAt: "",
      ...profile,
    },
    consents: [
      { id: "c1", profileId: "p1", type: "publication", grantedAt: "", revokedAt: null, evidencePath: null, method: "x", recordedBy: "a" },
      { id: "c2", profileId: "p1", type: "photo_rights", grantedAt: "", revokedAt: null, evidencePath: null, method: "x", recordedBy: "a" },
    ],
    verifications: [{ id: "v1", profileId: "p1", type: "age", status: "approved", method: "x", documentPath: null, checkedBy: "a", checkedAt: "", retainUntil: null, note: null, createdAt: "" }],
    media: [{ id: "i1", profileId: "p1", kind: "image", status: "ready", storagePath: "x", thumbPath: null, publicUrl: "/x.webp", publicPosterUrl: null, publicPaths: [], mimeType: "image/webp", bytes: 1, alt: "", width: 1, height: 1, durationSeconds: null, position: 0, isCover: true, rightsConfirmed: true, ownershipSource: "owner", ownershipNote: null, rightsConfirmedBy: "a", rightsConfirmedAt: "", moderation: "approved", moderatedBy: "a", moderatedAt: "", sha256: null, dhash: null, failureReason: null, createdAt: "" }],
    reports: [],
    interestNames: [],
    now,
    ...over,
  };
}

const failed = (c: PublishContext) => evaluatePublishReadiness(c).checks.filter((x) => !x.passed).map((x) => x.id);

describe("yayın ön koşulları", () => {
  it("tüm koşullar sağlanınca yayına hazırdır", () => {
    expect(evaluatePublishReadiness(ctx()).ready).toBe(true);
  });
  it("yayın yetkilendirmesi yoksa engeller", () => {
    expect(failed(ctx({ consents: ctx().consents.filter((c) => c.type !== "publication") }))).toEqual(["publication_consent"]);
  });
  it("geri alınmış rızayı geçersiz sayar", () => {
    const consents = ctx().consents.map((c) => (c.type === "publication" ? { ...c, revokedAt: "2026-10-01" } : c));
    expect(failed(ctx({ consents }))).toContain("publication_consent");
  });
  it("yaş doğrulaması ve 18+ şartını ayrı ayrı denetler", () => {
    expect(failed(ctx({ verifications: [] }))).toEqual(["age_verified"]);
    expect(failed(ctx({}, { birthDate: "2009-01-01" }))).toEqual(["adult"]);
  });
  it("fotoğraf haklarını denetler", () => {
    expect(failed(ctx({ media: [] }))).toEqual(["approved_cover"]);
    expect(failed(ctx({ media: ctx().media.map((i) => ({ ...i, rightsConfirmed: false })) }))).toEqual(["approved_cover"]);
  });
  it("moderasyon onayı ve içerik politikasını denetler", () => {
    expect(failed(ctx({}, { moderationStatus: "pending" }))).toEqual(["moderation_approved"]);
    expect(failed(ctx({}, { bio: "Saatlik görüşme için whatsapp 0532 111 22 33 yazın lütfen" }))).toEqual(["content_policy"]);
  });
  it("açık kritik şikâyet varken engeller", () => {
    const reports = [{ id: "r", profileId: "p1", category: "suspected_minor" as const, description: "", reporterEmail: null, status: "open" as const, resolution: null, reporterHash: "", createdAt: "", updatedAt: "" }];
    expect(failed(ctx({ reports }))).toEqual(["no_critical_reports"]);
    expect(failed(ctx({ reports: reports.map((r) => ({ ...r, status: "rejected" as const })) }))).toEqual([]);
  });
  it("durum geçişlerini sınırlar", () => {
    expect(canTransition("archived", "published")).toBe(false);
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(true);
  });
});

describe("abonelik durumları", () => {
  const sub = (o: Partial<Subscription>): Subscription => ({
    id: "s", profileId: "p", planId: "pl", startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-11-01T00:00:00Z", status: "active",
    autoRenew: false, sponsored: true, cancelledAt: null, externalRef: null, note: null, createdAt: "", ...o,
  });
  const plan = (o: Partial<MembershipPlan> = {}): MembershipPlan => ({ id: "pl", code: "plus", name: "Plus", description: "", storageQuotaMb: 1500, sponsoredEligible: true, advancedStats: false, customization: false, priceMonthlyTry: 0, active: true, ...o });

  it("tarihlere göre etkin durumu hesaplar", () => {
    expect(effectiveStatus(sub({}), now)).toBe("active");
    expect(effectiveStatus(sub({ startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-12-01T00:00:00Z" }), now)).toBe("scheduled");
    expect(effectiveStatus(sub({ endsAt: "2026-10-10T00:00:00Z" }), now)).toBe("expired");
    expect(effectiveStatus(sub({ status: "cancelled" }), now)).toBe("cancelled");
  });
  it("yaklaşan bitişi tespit eder", () => {
    expect(isExpiringSoon(sub({ endsAt: "2026-10-20T00:00:00Z" }), now)).toBe(true);
    expect(isExpiringSoon(sub({}), now)).toBe(false);
  });
  it("yenilemeyi mevcut bitişten başlatır, süresi dolmuşsa bugünden", () => {
    expect(renewalPeriod(sub({}), 2, now).endsAt).toBe("2027-01-01T00:00:00.000Z");
    expect(renewalPeriod(sub({ endsAt: "2026-01-01T00:00:00Z" }), 1, now).startsAt).toBe(now.toISOString());
    expect(() => renewalPeriod(sub({}), 0, now)).toThrow();
  });
  it("iptal ve sponsorluk kurallarını uygular", () => {
    expect(canCancel(sub({ endsAt: "2026-10-10T00:00:00Z" }), now)).toBe(false);
    expect(isSponsoredNow(sub({}), plan(), now)).toBe(true);
    expect(isSponsoredNow(sub({}), plan({ sponsoredEligible: false }), now)).toBe(false);
    expect(isSponsoredNow(sub({ status: "cancelled" }), plan(), now)).toBe(false);
  });
});
