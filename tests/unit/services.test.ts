import { memoryGet, resetMemoryStorage } from "@/server/storage/memory";
import { docFromPlainText } from "@/domain/rich-text";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import type { Admin } from "@/domain/types";
import { resetRateLimits } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { resetDemoStore } from "@/server/repositories/memory";
import { DomainError, PublishBlockedError, RateLimitedError } from "@/server/services/errors";
import { processUpload, sniffImageType } from "@/server/services/images";
import { REPORTS_PER_HOUR, submitReport } from "@/server/services/moderation";
import * as profiles from "@/server/services/profiles";
import { cancelSubscription, createSubscription, renewSubscription } from "@/server/services/subscriptions";
import { submitPrivacyRequest } from "@/server/services/privacy";

let admin: Admin;
const repo = () => getRepository();

beforeEach(async () => {
  resetDemoStore();
  resetMemoryStorage();
  resetRateLimits();
  admin = (await repo().getAdmin("admin-0001"))!;
});

const input = {
  nickname: "Test Kişi",
  birthDate: "1994-04-04",
  provincePlate: 34,
  districtSlug: "kadikoy",
  bio: "Kitap kulübü ve sahil yürüyüşlerini seven sentetik test profili.",
  bioDoc: docFromPlainText("Yetişkinler için sentetik sosyal test profili."),
  interestIds: [] as string[],
  seoTitle: null,
  seoDescription: null,
  noindex: false,
};

async function pngBuffer(withExif = false) {
  let img = sharp({ create: { width: 64, height: 80, channels: 3, background: "#88aacc" } }).png();
  if (withExif) img = img.withMetadata({ exif: { IFD0: { Copyright: "secret-gps-test" } } });
  return img.toBuffer();
}

async function makeReady(id: string) {
  await profiles.recordConsent(admin, id, "publication", "test");
  await profiles.recordConsent(admin, id, "photo_rights", "test");
  await profiles.recordVerification(admin, id, { type: "age", status: "approved", method: "test", note: null });
  const img = await profiles.uploadProfileImage(admin, id, await pngBuffer(), "alt");
  await profiles.confirmImageRights(admin, id, img.id, true);
  await profiles.setModeration(admin, id, "approved", null);
}

describe("profil yaşam döngüsü", () => {
  it("profil taslak olarak oluşturulur ve denetim kaydı düşer", async () => {
    const p = await profiles.createProfile(admin, input);
    expect(p.status).toBe("draft");
    expect(p.slug).toMatch(/^test-kisi-[0-9a-f]{6}$/);
    const logs = await repo().listAuditLogs({ limit: 10, entityId: p.id });
    expect(logs.map((l) => l.action)).toContain("profile.create");
  });

  it("geçersiz ilçe reddedilir", async () => {
    await expect(profiles.createProfile(admin, { ...input, districtSlug: "cankaya" })).rejects.toBeInstanceOf(DomainError);
  });

  it("yayın yetkisi olmayan profil yayınlanamaz", async () => {
    const p = await profiles.createProfile(admin, input);
    await expect(profiles.publishProfile(admin, p.id)).rejects.toBeInstanceOf(PublishBlockedError);
    const logs = await repo().listAuditLogs({ limit: 10, entityId: p.id });
    expect(logs.map((l) => l.action)).toContain("profile.publish_blocked");
    expect((await repo().getProfile(p.id))!.status).toBe("draft");
  });

  it("tüm ön koşullar tamamlanınca yayınlanır ve kamuya görünür", async () => {
    const p = await profiles.createProfile(admin, input);
    await makeReady(p.id);
    const published = await profiles.publishProfile(admin, p.id);
    expect(published.status).toBe("published");
    const pub = await repo().getPublicProfile(p.slug);
    expect(pub?.nickname).toBe("Test Kişi");
    expect(pub && "birthDate" in pub).toBe(false);
  });

  it("hakları doğrulanmamış yeni fotoğraf kamuya gösterilmez", async () => {
    const p = await profiles.createProfile(admin, input);
    await makeReady(p.id);
    await profiles.publishProfile(admin, p.id);
    await profiles.uploadProfileImage(admin, p.id, await sharp({ create: { width: 80, height: 100, channels: 3, background: "#aa5577" } }).png().toBuffer(), "yeni");
    expect((await repo().getPublicProfile(p.slug))!.images).toHaveLength(1);
  });

  it("yayındaki profilin içeriği değişince yeniden moderasyona düşer", async () => {
    const p = await profiles.createProfile(admin, input);
    await makeReady(p.id);
    await profiles.publishProfile(admin, p.id);
    const { profile, requeued } = await profiles.updateProfile(admin, p.id, { ...input, bio: `${input.bio} Yeni cümle eklendi.` });
    expect(requeued).toBe(true);
    expect(profile.status).toBe("in_review");
    expect(await repo().getPublicProfile(p.slug)).toBeNull();
  });

  it("yasaklı içerikli profil moderasyonda onaylanamaz", async () => {
    const p = await profiles.createProfile(admin, { ...input, bio: "Gecelik görüşmeler için whatsapp üzerinden yazabilirsiniz arkadaşlar" });
    await expect(profiles.setModeration(admin, p.id, "approved", null)).rejects.toThrow(/İçerik politikası/);
  });

  it("arşivleme ve taslağa geri alma çalışır; arşiv yayından kaldırır", async () => {
    const p = await profiles.createProfile(admin, input);
    await makeReady(p.id);
    await profiles.publishProfile(admin, p.id);
    expect((await profiles.archiveProfile(admin, p.id)).status).toBe("archived");
    expect(await repo().getPublicProfile(p.slug)).toBeNull();
    await expect(profiles.publishProfile(admin, p.id)).rejects.toThrow();
    expect((await profiles.restoreToDraft(admin, p.id)).status).toBe("draft");
  });

  it("yayın rızası geri alınınca profil derhal yayından kalkar", async () => {
    const p = await profiles.createProfile(admin, input);
    await makeReady(p.id);
    await profiles.publishProfile(admin, p.id);
    const consent = (await repo().listConsents(p.id)).find((c) => c.type === "publication")!;
    await profiles.revokeConsent(admin, p.id, consent.id);
    expect((await repo().getProfile(p.id))!.status).toBe("unpublished");
  });

  it("18 yaş altı doğum tarihiyle yaş doğrulaması onaylanamaz", async () => {
    const p = await profiles.createProfile(admin, input);
    await repo().updateProfile(p.id, { birthDate: `${new Date().getFullYear() - 16}-01-01` });
    await expect(profiles.recordVerification(admin, p.id, { type: "age", status: "approved", method: "x", note: null })).rejects.toThrow(/18/);
  });

  it("paketin depolama kotasını uygular", async () => {
    const p = await profiles.createProfile(admin, input);
    const { requestUpload } = await import("@/server/services/media");
    await expect(requestUpload(admin, p.id, { mimeType: "video/mp4", bytes: 301 * 1024 * 1024, fileName: "test.mp4" })).rejects.toThrow(/büyük|kota/);
  });

  it("KVKK silme tüm ilişkili verileri ve dosyaları kaldırır", async () => {
    const p = await profiles.createProfile(admin, input);
    const img = await profiles.uploadProfileImage(admin, p.id, await pngBuffer(), "x");
    expect(memoryGet("priv", img.storagePath)).not.toBeNull();
    await profiles.deleteProfilePermanently(admin, p.id, "KVKK test");
    expect(await repo().getProfile(p.id)).toBeNull();
    expect(await repo().listMedia(p.id)).toHaveLength(0);
    expect(memoryGet("priv", img.storagePath)).toBeNull();
  });

  it("dışa aktarma doğrulama belgesi yolunu içermez", async () => {
    const p = await profiles.createProfile(admin, input);
    await profiles.recordVerification(admin, p.id, { type: "age", status: "approved", method: "x", note: null }, Buffer.from("%PDF-1.4 test"));
    const data = await profiles.exportProfileData(admin, p.id);
    expect(JSON.stringify(data)).not.toContain("verification-documents/");
  });

  it("saklama süresi dolan doğrulama belgeleri silinir", async () => {
    const p = await profiles.createProfile(admin, input);
    await profiles.recordVerification(admin, p.id, { type: "age", status: "approved", method: "x", note: null }, Buffer.from("%PDF-1.4 test"));
    expect(await profiles.purgeExpiredVerificationDocuments(new Date(Date.now() + 31 * 86_400_000))).toBe(1);
    expect((await repo().listVerifications(p.id))[0].documentPath).toBeNull();
  });
});

describe("görsel işleme", () => {
  it("magic byte ile tür tespit eder ve sahte uzantıyı reddeder", async () => {
    expect(sniffImageType(await pngBuffer())).toBe("image/png");
    await expect(processUpload(Buffer.from("<svg onload=alert(1)>"))).rejects.toThrow(/JPEG, PNG veya WebP/);
  });
  it("EXIF metadata'yı siler ve WebP'ye dönüştürür", async () => {
    const input = await pngBuffer(true);
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processUpload(input);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });
});

describe("şikâyetler", () => {
  const published = "prf-0001";

  it("şikâyet kaydedilir", async () => {
    const { report, autoUnpublished } = await submitReport({ profileId: published, category: "fake_profile", description: "Bu profil sahte görünüyor." }, "fp1");
    expect(report.status).toBe("open");
    expect(autoUnpublished).toBe(false);
  });

  it("kritik kategori profili otomatik yayından kaldırır ve tekrar yayını engeller", async () => {
    const { autoUnpublished } = await submitReport({ profileId: published, category: "suspected_minor", description: "Reşit olmayabilir, kontrol edin." }, "fp2");
    expect(autoUnpublished).toBe(true);
    expect((await repo().getProfile(published))!.status).toBe("unpublished");
    await expect(profiles.publishProfile(admin, published)).rejects.toBeInstanceOf(PublishBlockedError);
  });

  it("oran sınırlaması uygular", async () => {
    for (let i = 0; i < REPORTS_PER_HOUR; i++) {
      await submitReport({ profileId: published, category: "other", description: `Deneme şikâyeti ${i}` }, "fp3");
    }
    await expect(submitReport({ profileId: published, category: "other", description: "Bir tane daha" }, "fp3")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("yayında olmayan profile şikâyet alınmaz", async () => {
    const draft = (await repo().listProfiles()).find((p) => p.status === "draft")!;
    await expect(submitReport({ profileId: draft.id, category: "other", description: "Deneme açıklaması" }, "fp4")).rejects.toThrow(/bulunamadı/);
  });
});

describe("abonelikler", () => {
  it("oluşturma, çakışma engeli, yenileme ve iptal", async () => {
    const p = await profiles.createProfile(admin, input);
    const plans = await repo().listPlans();
    const basic = plans.find((x) => x.code === "basic")!;
    const plus = plans.find((x) => x.code === "plus")!;
    const today = new Date().toISOString().slice(0, 10);
    await expect(createSubscription(admin, { profileId: p.id, planId: basic.id, startsAt: today, months: 1, sponsored: true })).rejects.toThrow(/sponsorlu/);
    const sub = await createSubscription(admin, { profileId: p.id, planId: plus.id, startsAt: today, months: 1, sponsored: true });
    expect(sub.status).toBe("active");
    expect(sub.externalRef).toBeNull();
    await expect(createSubscription(admin, { profileId: p.id, planId: plus.id, startsAt: today, months: 1 })).rejects.toThrow(/çakışan/);
    const renewed = await renewSubscription(admin, sub.id, 2);
    expect(Date.parse(renewed.endsAt)).toBeGreaterThan(Date.parse(sub.endsAt));
    const cancelled = await cancelSubscription(admin, sub.id, "test");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.sponsored).toBe(false);
  });
});

describe("KVKK başvurusu", () => {
  it("30 günlük yanıt süresiyle kaydedilir ve profili eşleştirir", async () => {
    const slug = (await repo().getProfile("prf-0001"))!.slug;
    const req = await submitPrivacyRequest(
      { type: "removal", profileUrl: `https://x.test/profil/${slug}`, requesterName: "Test Kişi", requesterEmail: "a@b.co", relation: "self", details: "Profilimin kaldırılmasını istiyorum.", acknowledge: true },
      "fp5",
    );
    expect(req.profileId).toBe("prf-0001");
    expect(Math.round((Date.parse(req.dueAt) - Date.parse(req.createdAt)) / 86_400_000)).toBe(30);
  });
});
