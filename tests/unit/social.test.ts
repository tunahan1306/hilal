import { beforeEach, describe, expect, it } from "vitest";
import { canFollow, isBlockedEitherWay, isValidHandle, type UserBlock } from "@/domain/social";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { recordFeaturePolicyDecision } from "@/server/services/policy";
import {
  blockUser,
  createOwnProfile,
  followUser,
  getOwnPublicProfile,
  listConversationMessages,
  sendMessage,
  unblockUser,
  unfollowUser,
  updateOwnProfile,
} from "@/server/services/social";
import { createAppUserRecord, submitAgeVerification } from "@/server/services/identity";
import { AgeVerificationDisabledError } from "@/server/auth/age-verification";
import type { Admin } from "@/domain/types";

beforeEach(resetDemoStore);

const owner: Admin = { id: "admin-0001", email: "admin@demo.local", displayName: "Demo", role: "owner", mfaEnrolled: true, createdAt: "" };
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

describe("sosyal kuralları (saf)", () => {
  it("handle formatı doğrulanır", () => {
    expect(isValidHandle("kullanici_1")).toBe(true);
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("Buyuk_Harf")).toBe(false);
    expect(isValidHandle("nokta.var")).toBe(false);
  });

  it("engellenen taraflar birbirini takip edemez; kendini takip edemez", () => {
    const blocks: UserBlock[] = [{ blockerId: "a", blockedId: "b", createdAt: "" }];
    expect(canFollow("a", "b", blocks)).toBe(false);
    expect(canFollow("b", "a", blocks)).toBe(false); // ters yönde de engellenir
    expect(canFollow("a", "a", [])).toBe(false);
    expect(canFollow("a", "c", blocks)).toBe(true);
  });

  it("isBlockedEitherWay iki yönü de kapsar", () => {
    const blocks: UserBlock[] = [{ blockerId: "x", blockedId: "y", createdAt: "" }];
    expect(isBlockedEitherWay(blocks, "x", "y")).toBe(true);
    expect(isBlockedEitherWay(blocks, "y", "x")).toBe(true);
    expect(isBlockedEitherWay(blocks, "y", "z")).toBe(false);
  });
});

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  return createAppUserRecord({ id, email });
}

describe("profil (bellek deposu + servis)", () => {
  it("18 yaşından küçük profil oluşturamaz; aynı handle iki kez kullanılamaz", async () => {
    const user = await makeUser("a@test.local");
    await expect(createOwnProfile(user, { handle: "genc_biri", displayName: "Genç", birthDate: day(-365 * 10), countryCode: "nl" })).rejects.toThrow(/18 yaşından küçük/);
    await createOwnProfile(user, { handle: "kullanici_a", displayName: "A", birthDate: "1990-01-01", countryCode: "nl" });
    const user2 = await makeUser("b@test.local");
    await expect(createOwnProfile(user2, { handle: "kullanici_a", displayName: "B", birthDate: "1990-01-01", countryCode: "nl" })).rejects.toThrow(/alınmış/);
  });

  it("yaş doğrulaması ve ülke izni olmadan profil kamuya asla açılmaz; politika kapalıyken public yapılamaz", async () => {
    const user = await makeUser("a@test.local");
    await createOwnProfile(user, { handle: "kullanici_a", displayName: "A", birthDate: "1990-01-01", countryCode: "nl" });
    await expect(updateOwnProfile(user, { visibility: "public" })).rejects.toThrow(/henüz izinli değil/);

    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "social_profiles",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:social_profiles",
    });
    await updateOwnProfile(user, { visibility: "public" });
    // Ülke izni var ama moderasyon onayı (varsayılan: pending) ve yaş doğrulaması
    // (sağlayıcı devre dışı, bir sonraki test) henüz yok — hâlâ görünmemeli.
    expect(await getOwnPublicProfile(user)).toBeNull();
  });

  it("yaş doğrulama sağlayıcısı devre dışı olduğu için profil hiçbir zaman gerçekten kamuya açılamaz", async () => {
    const user = await makeUser("a@test.local");
    await expect(submitAgeVerification(user, { providerSessionRef: "ref" })).rejects.toThrow(AgeVerificationDisabledError);
  });
});

describe("takip ve engelleme (bellek deposu + servis)", () => {
  it("takip edilince bildirim oluşur; takipten çıkınca kalkar", async () => {
    const a = await makeUser("a@test.local");
    const b = await makeUser("b@test.local");
    await followUser(a, { targetUserId: b.id });
    const notifs = await createMemoryRepository().listNotifications(b.id);
    expect(notifs).toHaveLength(1);
    expect(notifs[0]!.type).toBe("new_follower");
    expect(await createMemoryRepository().listFollowing(a.id)).toEqual([b.id]);
    await unfollowUser(a, { targetUserId: b.id });
    expect(await createMemoryRepository().listFollowing(a.id)).toEqual([]);
  });

  it("engelleme karşılıklı takibi temizler ve yeniden takibi engeller", async () => {
    const a = await makeUser("a@test.local");
    const b = await makeUser("b@test.local");
    await followUser(a, { targetUserId: b.id });
    await followUser(b, { targetUserId: a.id });
    await blockUser(a, { targetUserId: b.id });
    expect(await createMemoryRepository().listFollowing(a.id)).toEqual([]);
    expect(await createMemoryRepository().listFollowing(b.id)).toEqual([]);
    await expect(followUser(b, { targetUserId: a.id })).rejects.toThrow(/takip edemezsiniz/);
    await unblockUser(a, { targetUserId: b.id });
    await followUser(b, { targetUserId: a.id }); // engel kalktıktan sonra tekrar mümkün
  });

  it("kendini engelleyemez", async () => {
    const a = await makeUser("a@test.local");
    await expect(blockUser(a, { targetUserId: a.id })).rejects.toThrow(/Kendinizi/);
  });
});

describe("mesajlaşma (bellek deposu + servis)", () => {
  it("engellenen taraf mesaj gönderemez; katılımcı olmayan mesajları okuyamaz", async () => {
    const a = await makeUser("a@test.local");
    const b = await makeUser("b@test.local");
    const c = await makeUser("c@test.local");
    const msg = await sendMessage(a, { targetUserId: b.id, body: "merhaba" });
    expect(msg.senderId).toBe(a.id);

    await blockUser(b, { targetUserId: a.id });
    await expect(sendMessage(a, { targetUserId: b.id, body: "tekrar" })).rejects.toThrow(/mesajlaşamazsınız/);

    const conversation = (await createMemoryRepository().startOrGetConversation(a.id, b.id)).id;
    const messages = await listConversationMessages(a, conversation);
    expect(messages).toHaveLength(1);
    await expect(listConversationMessages(c, conversation)).rejects.toThrow(/erişiminiz yok/);
  });

  it("aynı iki kullanıcı arasında ikinci mesaj aynı konuşmaya düşer (yeni konuşma açılmaz)", async () => {
    const a = await makeUser("a@test.local");
    const b = await makeUser("b@test.local");
    await sendMessage(a, { targetUserId: b.id, body: "bir" });
    await sendMessage(b, { targetUserId: a.id, body: "iki" });
    const repo = createMemoryRepository();
    const conv = await repo.startOrGetConversation(a.id, b.id);
    const messages = await repo.listMessages(conv.id, { limit: 50 });
    expect(messages).toHaveLength(2);
  });
});
