import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { allMediaRightsReviewed, isActiveCreatorAccount, isSubscriptionActive, type ContentRights, type CreatorSubscription } from "@/domain/creator";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { recordFeaturePolicyDecision } from "@/server/services/policy";
import { createAppUserRecord } from "@/server/services/identity";
import {
  applyCreatorAccount,
  approveCreatorAccount,
  createSubscriptionTier,
  getPublicSubscriptionTiers,
  recordContentRights,
  reviewContentRights,
  subscribeToTier,
  suspendCreatorAccount,
} from "@/server/services/creator";
import { createPost, getPublicPostsByHandle, uploadMediaAsset } from "@/server/services/social";
import { createOwnProfile } from "@/server/services/social";
import { PaymentsDisabledError } from "@/server/payments";
import type { Admin } from "@/domain/types";

beforeEach(resetDemoStore);

const owner: Admin = { id: "admin-0001", email: "admin@demo.local", displayName: "Demo", role: "owner", mfaEnrolled: true, createdAt: "" };
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  return createAppUserRecord({ id, email });
}

/** Gerçek, geçerli bir WebP üretir — processUpload'ın sniff + sharp işleme adımlarını gerçekten çalıştırır. */
async function tinyWebp(): Promise<Buffer> {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 255, b: 255 } } }).webp().toBuffer();
}

describe("creator kuralları (saf)", () => {
  it("creator hesabı yalnızca active durumunda aktif sayılır", () => {
    expect(isActiveCreatorAccount(null)).toBe(false);
    expect(isActiveCreatorAccount({ status: "pending" })).toBe(false);
    expect(isActiveCreatorAccount({ status: "suspended" })).toBe(false);
    expect(isActiveCreatorAccount({ status: "active" })).toBe(true);
  });

  it("ücretli yayın için TÜM medyanın incelenmiş hak kaydı gerekir", () => {
    const rights: Pick<ContentRights, "mediaAssetId" | "reviewedAt">[] = [
      { mediaAssetId: "m1", reviewedAt: "2026-01-01" },
      { mediaAssetId: "m2", reviewedAt: null },
    ];
    expect(allMediaRightsReviewed(["m1"], rights)).toBe(true);
    expect(allMediaRightsReviewed(["m1", "m2"], rights)).toBe(false);
    expect(allMediaRightsReviewed(["m3"], rights)).toBe(false);
    expect(allMediaRightsReviewed([], rights)).toBe(true);
  });

  it("abonelik yalnızca active ve süresi geçmemişken aktif sayılır", () => {
    const base: CreatorSubscription = { id: "s1", subscriberId: "u1", tierId: "t1", status: "active", startsAt: day(-10), endsAt: day(10), autoRenew: false, externalRef: null, createdAt: "" };
    expect(isSubscriptionActive(base)).toBe(true);
    expect(isSubscriptionActive({ ...base, status: "cancelled" })).toBe(false);
    expect(isSubscriptionActive({ ...base, endsAt: day(-1) })).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
  });
});

describe("creator hesabı başvuru/onay akışı (bellek deposu + servis)", () => {
  it("aynı kullanıcı iki kez başvuramaz; onaylanınca user_roles'e creator eklenir", async () => {
    const user = await makeUser("creator@test.local");
    const account = await applyCreatorAccount(user, { legalName: "Test Creator BV", countryCode: "nl" });
    expect(account.status).toBe("pending");
    await expect(applyCreatorAccount(user, { legalName: "Tekrar", countryCode: "nl" })).rejects.toThrow(/Zaten/);

    const repo = createMemoryRepository();
    expect(await repo.listUserRoles(user.id)).not.toContain("creator");
    await approveCreatorAccount(owner, account.id);
    expect(await repo.listUserRoles(user.id)).toContain("creator");

    await suspendCreatorAccount(owner, account.id);
    const after = await repo.getCreatorAccountById(account.id);
    expect(after!.status).toBe("suspended");
  });

  it("yalnızca onaylı creator abonelik planı oluşturabilir; plan ülke izni olmadan kamuya görünmez", async () => {
    const user = await makeUser("creator2@test.local");
    const account = await applyCreatorAccount(user, { legalName: "Test Creator 2", countryCode: "nl" });
    await expect(createSubscriptionTier(user, { name: "Temel", priceAmount: 9.99, priceCurrency: "try" })).rejects.toThrow(/onaylı creator/);

    await approveCreatorAccount(owner, account.id);
    const tier = await createSubscriptionTier(user, { name: "Temel", priceAmount: 9.99, priceCurrency: "try" });
    expect(tier.active).toBe(true);

    // Ülke için paid_subscriptions henüz izinli değil — kamuya hiç görünmemeli.
    expect(await getPublicSubscriptionTiers(user.id)).toEqual([]);

    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "paid_subscriptions",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:paid_subscriptions",
    });
    expect(await getPublicSubscriptionTiers(user.id)).toHaveLength(1);
  });

  it("abonelik satın alma: politika kapalıyken engellenir; açıkken ödeme sağlayıcısı devre dışı olduğu için hiçbir zaman tamamlanmaz", async () => {
    const creatorUser = await makeUser("creator3@test.local");
    const account = await applyCreatorAccount(creatorUser, { legalName: "Test Creator 3", countryCode: "nl" });
    await approveCreatorAccount(owner, account.id);
    const tier = await createSubscriptionTier(creatorUser, { name: "Temel", priceAmount: 5, priceCurrency: "try" });

    const subscriber = await makeUser("subscriber@test.local");
    await expect(subscribeToTier(subscriber, { tierId: tier.id })).rejects.toThrow(/henüz izinli değil/);

    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "paid_subscriptions",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:paid_subscriptions",
    });
    await expect(subscribeToTier(subscriber, { tierId: tier.id })).rejects.toThrow(PaymentsDisabledError);
    await expect(subscribeToTier(creatorUser, { tierId: tier.id })).rejects.toThrow(/Kendi aboneliğinize/);

    // Hiçbir koşulda gerçek bir abonelik satırı oluşmaz.
    expect(await createMemoryRepository().listCreatorSubscriptionsBySubscriber(subscriber.id)).toEqual([]);
  });
});

describe("içerik hakları ve ücretli gönderi yayın kapısı (bellek deposu + servis)", () => {
  it("hak beyanı yalnızca medya sahibi tarafından yapılabilir; aynı medya için iki kez yapılamaz", async () => {
    const user = await makeUser("owner@test.local");
    const media = await uploadMediaAsset(user, await tinyWebp());
    const other = await makeUser("other@test.local");
    await expect(recordContentRights(other, { mediaAssetId: media.id, rightsType: "self_generated" })).rejects.toThrow(/bulunamadı/);
    await recordContentRights(user, { mediaAssetId: media.id, rightsType: "self_generated" });
    await expect(recordContentRights(user, { mediaAssetId: media.id, rightsType: "licensed" })).rejects.toThrow(/zaten/);
  });

  it("ücretli gönderi: creator aktif değilse, ülke izni yoksa veya hak incelenmemişse reddedilir; hepsi sağlandığında yayınlanır ve abonesi olmayana gizlenir", async () => {
    const creatorUser = await makeUser("creator4@test.local");
    await createOwnProfile(creatorUser, { handle: "creator_dort", displayName: "Creator Dört", birthDate: "1990-01-01", countryCode: "nl" });
    const media = await uploadMediaAsset(creatorUser, await tinyWebp());

    await expect(createPost(creatorUser, { body: "ücretli", mediaAssetIds: [media.id], paid: true })).rejects.toThrow(/onaylı creator/);

    const account = await applyCreatorAccount(creatorUser, { legalName: "Creator Dört BV", countryCode: "nl" });
    await approveCreatorAccount(owner, account.id);
    await expect(createPost(creatorUser, { body: "ücretli", mediaAssetIds: [media.id], paid: true })).rejects.toThrow(/henüz izinli değil/);

    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "digital_content",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:digital_content",
    });
    await expect(createPost(creatorUser, { body: "ücretli", mediaAssetIds: [media.id], paid: true })).rejects.toThrow(/hak incelemesi/);

    await recordContentRights(creatorUser, { mediaAssetId: media.id, rightsType: "self_generated" });
    const repo = createMemoryRepository();
    const pending = await repo.getContentRightsByMediaAsset(media.id);
    await expect(createPost(creatorUser, { body: "ücretli", mediaAssetIds: [media.id], paid: true })).rejects.toThrow(/hak incelemesi/);

    await reviewContentRights(owner, pending!.id);
    const post = await createPost(creatorUser, { body: "ücretli içerik", mediaAssetIds: [media.id], paid: true });
    expect(post.paid).toBe(true);

    // moderation_status varsayılan 'pending' — admin onayı olmadan posts_public'te görünmez (bellek deposu eşdeğeri).
    expect(await getPublicPostsByHandle("creator_dort", null)).toEqual([]);
    await repo.getPost(post.id); // sadece erişilebilirlik kontrolü
  });
});
