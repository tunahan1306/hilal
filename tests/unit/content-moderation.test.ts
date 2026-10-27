import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import type { Admin } from "@/domain/types";
import { MODERATION_CONTENT_TYPES, REPORTABLE_CONTENT_TYPES } from "@/domain/moderation";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { resetRateLimits } from "@/server/rate-limit";
import { createAppUserRecord } from "@/server/services/identity";
import { createPost, uploadMediaAsset } from "@/server/services/social";
import { applyCreatorAccount, approveCreatorAccount } from "@/server/services/creator";
import { submitReport, startReview } from "@/server/services/moderation";
import { DomainError, RateLimitedError } from "@/server/services/errors";
import { CONTENT_REPORTS_PER_HOUR, CONTENT_REPORTS_PER_TARGET_PER_HOUR, submitContentReport, triageContentReport } from "@/server/services/content-moderation";

beforeEach(() => {
  resetDemoStore();
  resetRateLimits();
});

const owner: Admin = { id: "admin-0001", email: "admin@demo.local", displayName: "Demo", role: "owner", mfaEnrolled: true, createdAt: "" };

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  return createAppUserRecord({ id, email });
}

async function tinyWebp(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 10, g: 10, b: 10 } } }).webp().toBuffer();
}

describe("Modül E sabitleri (saf)", () => {
  it("MODERATION_CONTENT_TYPES profile'ı içerir; REPORTABLE_CONTENT_TYPES içermez", () => {
    expect(MODERATION_CONTENT_TYPES).toContain("profile");
    expect(REPORTABLE_CONTENT_TYPES).not.toContain("profile");
    expect(REPORTABLE_CONTENT_TYPES).toEqual(expect.arrayContaining(["user_profile", "post", "message", "media_asset", "creator_account"]));
  });
});

describe("admin-küratörlü ürünün profil şikâyeti geriye uyumlu kalır (bellek deposu + servis)", () => {
  it("submitReport hâlâ content_type='profile' ve content_id=profileId üretir", async () => {
    const repo = createMemoryRepository();
    const profiles = await repo.listProfiles();
    const published = profiles.find((p) => p.status === "published")!;
    const { report } = await submitReport({ profileId: published.id, category: "other", description: "Modül E regresyon testi açıklaması" }, "fp-regress");
    expect(report.contentType).toBe("profile");
    expect(report.contentId).toBe(published.id);
    expect(report.profileId).toBe(published.id);
  });

  it("startReview, profil dışı bir şikâyete uygulanamaz (simetrik koruma)", async () => {
    const actor = await makeUser("owner@test.local");
    const post = await createPost(actor, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "spam", description: "Bu gönderi spam içeriyor" }, "fp-cross");
    await expect(startReview(owner, report.id)).rejects.toThrow(/profil için değil/);
  });
});

describe("genelleştirilmiş içerik şikâyeti (bellek deposu + servis)", () => {
  it("var olmayan içerik bildirilemez; oran sınırlaması (toplam ve hedef başına) uygulanır", async () => {
    const actor = await makeUser("reporter@test.local");
    void actor;
    await expect(
      submitContentReport({ contentType: "post", contentId: crypto.randomUUID(), category: "other", description: "Var olmayan içerik testi" }, "fp1"),
    ).rejects.toThrow(/bulunamadı/);

    const author = await makeUser("author@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });

    for (let i = 0; i < CONTENT_REPORTS_PER_TARGET_PER_HOUR; i++) {
      await submitContentReport({ contentType: "post", contentId: post.id, category: "other", description: `Deneme şikâyeti ${i}` }, `fp-unique-${i}`);
    }
    await expect(
      submitContentReport({ contentType: "post", contentId: post.id, category: "other", description: "Hedef sınırı aşımı" }, "fp-unique-last"),
    ).rejects.toThrow(/çok sayıda bildirim/);
  });

  it("aynı parmak izinden saatte en fazla CONTENT_REPORTS_PER_HOUR bildirim kabul edilir", async () => {
    const author = await makeUser("author2@test.local");
    const posts = await Promise.all(Array.from({ length: CONTENT_REPORTS_PER_HOUR + 1 }, () => createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false })));
    for (let i = 0; i < CONTENT_REPORTS_PER_HOUR; i++) {
      await submitContentReport({ contentType: "post", contentId: posts[i]!.id, category: "other", description: `Parmak izi testi ${i}` }, "fp-same");
    }
    await expect(
      submitContentReport({ contentType: "post", contentId: posts[CONTENT_REPORTS_PER_HOUR]!.id, category: "other", description: "Sınır aşımı" }, "fp-same"),
    ).rejects.toThrow(RateLimitedError);
  });

  it("profile_id her zaman null kalır; content_type/content_id doğru ayarlanır", async () => {
    const author = await makeUser("author3@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "harassment", description: "Taciz içerikli gönderi bildirimi" }, "fp-shape");
    expect(report.profileId).toBeNull();
    expect(report.contentType).toBe("post");
    expect(report.contentId).toBe(post.id);
  });
});

describe("genelleştirilmiş triyaj (bellek deposu + servis)", () => {
  it("dismiss: şikâyeti reddeder, içeriğe dokunmaz", async () => {
    const author = await makeUser("a4@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "other", description: "Reddedilecek şikâyet testi" }, "fp-dismiss");
    await triageContentReport(owner, report.id, { action: "dismiss", note: "Asılsız bulundu" });
    const repo = createMemoryRepository();
    expect((await repo.getReport(report.id))!.status).toBe("rejected");
    expect((await repo.getPost(post.id))!.moderationStatus).toBe("pending");
  });

  it("warn: içerik sahibine moderation_warning bildirimi gönderir", async () => {
    const author = await makeUser("a5@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "other", description: "Uyarı gönderilecek şikâyet testi" }, "fp-warn");
    await triageContentReport(owner, report.id, { action: "warn", note: "Kurallara dikkat edin" });
    const repo = createMemoryRepository();
    const notifs = await repo.listNotifications(author.id);
    expect(notifs.some((n) => n.type === "moderation_warning")).toBe(true);
  });

  it("remove_content: post/media_asset moderationStatus'u rejected yapar; creator_account askıya alır", async () => {
    const repo = createMemoryRepository();
    const author = await makeUser("a6@test.local");
    const post = await createPost(author, { body: "kaldırılacak", mediaAssetIds: [], paid: false });
    const postReport = await submitContentReport({ contentType: "post", contentId: post.id, category: "harassment", description: "Kaldırılacak gönderi bildirimi" }, "fp-remove-post");
    await triageContentReport(owner, postReport.id, { action: "remove_content", note: "Kural ihlali" });
    expect((await repo.getPost(post.id))!.moderationStatus).toBe("rejected");

    const mediaOwner = await makeUser("a7@test.local");
    const media = await uploadMediaAsset(mediaOwner, await tinyWebp());
    const mediaReport = await submitContentReport({ contentType: "media_asset", contentId: media.id, category: "harassment", description: "Kaldırılacak medya bildirimi" }, "fp-remove-media");
    await triageContentReport(owner, mediaReport.id, { action: "remove_content", note: "Kural ihlali" });
    expect((await repo.getMediaAsset(media.id))!.moderationStatus).toBe("rejected");

    const creatorUser = await makeUser("a8@test.local");
    const account = await applyCreatorAccount(creatorUser, { legalName: "Test Creator", countryCode: "nl" });
    await approveCreatorAccount(owner, account.id);
    const creatorReport = await submitContentReport({ contentType: "creator_account", contentId: account.id, category: "other", description: "Creator hesabı bildirimi testi" }, "fp-remove-creator");
    await triageContentReport(owner, creatorReport.id, { action: "remove_content", note: "Hesap ihlali" });
    expect((await repo.getCreatorAccountById(account.id))!.status).toBe("suspended");
  });

  it("suspend_account: içerik sahibinin app_user durumunu askıya alır", async () => {
    const author = await makeUser("a9@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "csam_suspected", description: "Hesap askıya alınacak bildirim testi" }, "fp-suspend");
    await triageContentReport(owner, report.id, { action: "suspend_account", note: "Ciddi ihlal" });
    const repo = createMemoryRepository();
    expect((await repo.getAppUserById(author.id))!.status).toBe("suspended");
  });

  it("zaten sonuçlandırılmış şikâyet tekrar triyaj edilemez", async () => {
    const author = await makeUser("a10@test.local");
    const post = await createPost(author, { body: "gönderi", mediaAssetIds: [], paid: false });
    const report = await submitContentReport({ contentType: "post", contentId: post.id, category: "other", description: "Tekrar triyaj testi açıklaması" }, "fp-twice");
    await triageContentReport(owner, report.id, { action: "dismiss" });
    await expect(triageContentReport(owner, report.id, { action: "warn" })).rejects.toThrow(DomainError);
  });
});
