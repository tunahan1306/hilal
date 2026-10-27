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

/** Mesaj gönderebilmek için profil + ülkede izinli private_messaging gerekir (fail-closed). */
async function makeMessenger(email: string, handle: string) {
  const user = await makeUser(email);
  await createOwnProfile(user, { handle, displayName: handle, birthDate: "1990-01-01", countryCode: "nl" });
  return user;
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

  it("aynı kullanıcıyı iki kez takip etmek/engellemek tekrar bildirim veya kopya satır oluşturmaz (idempotent — çift tıklama/yeniden gönderim)", async () => {
    const a = await makeUser("idem-a@test.local");
    const b = await makeUser("idem-b@test.local");
    await followUser(a, { targetUserId: b.id });
    await followUser(a, { targetUserId: b.id });
    const repo = createMemoryRepository();
    expect(await repo.listFollowing(a.id)).toEqual([b.id]);
    expect(await repo.listNotifications(b.id)).toHaveLength(1);

    await blockUser(a, { targetUserId: b.id });
    await blockUser(a, { targetUserId: b.id });
    expect((await repo.listBlocksInvolving(a.id)).filter((x) => x.blockerId === a.id && x.blockedId === b.id)).toHaveLength(1);
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
  it("profili olmayan kullanıcı mesaj gönderemez (fail-closed — ülke kapısı asla atlanmaz)", async () => {
    const a = await makeUser("profilsiz@test.local");
    const b = await makeUser("hedef@test.local");
    await expect(sendMessage(a, { targetUserId: b.id, body: "merhaba" })).rejects.toThrow(/sosyal profil oluşturmalısınız/);
  });

  it("ülkede private_messaging izinli değilken mesaj engellenir", async () => {
    const a = await makeMessenger("a2@test.local", "kullanici_a2");
    const b = await makeUser("hedef2@test.local");
    await expect(sendMessage(a, { targetUserId: b.id, body: "merhaba" })).rejects.toThrow(/henüz izinli değil/);
  });

  it("engellenen taraf mesaj gönderemez; katılımcı olmayan mesajları okuyamaz", async () => {
    const a = await makeMessenger("a@test.local", "kullanici_a");
    const b = await makeUser("b@test.local");
    const c = await makeUser("c@test.local");
    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "private_messaging",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:private_messaging",
    });
    const msg = await sendMessage(a, { targetUserId: b.id, body: "merhaba" });
    expect(msg.senderId).toBe(a.id);

    await blockUser(b, { targetUserId: a.id });
    await expect(sendMessage(a, { targetUserId: b.id, body: "tekrar" })).rejects.toThrow(/mesajlaşamazsınız/);

    const conversation = (await createMemoryRepository().startOrGetConversation(a.id, b.id)).id;
    const messages = await listConversationMessages(a, conversation);
    expect(messages).toHaveLength(1);
    await expect(listConversationMessages(c, conversation)).rejects.toThrow(/erişiminiz yok/);
  });

  it("aynı iki kullanıcı arasında ikinci mesaj aynı konuşmaya düşer (yeni konuşma açılmaz); reddedilen/silinen mesaj okuma yolunda görünmez", async () => {
    const a = await makeMessenger("a3@test.local", "kullanici_a3");
    const b = await makeMessenger("b3@test.local", "kullanici_b3");
    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "private_messaging",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:private_messaging",
    });
    await sendMessage(a, { targetUserId: b.id, body: "bir" });
    const second = await sendMessage(b, { targetUserId: a.id, body: "iki" });
    const repo = createMemoryRepository();
    const conv = await repo.startOrGetConversation(a.id, b.id);
    expect(await repo.listMessages(conv.id, { limit: 50 })).toHaveLength(2);

    // Modül E triyajı (remove_content) moderation_status'u 'rejected' yapar — okuma yolu artık onu hiç döndürmez.
    await repo.setContentModerationStatus("message", second.id, "rejected", owner.id);
    const afterRemoval = await repo.listMessages(conv.id, { limit: 50 });
    expect(afterRemoval).toHaveLength(1);
    expect(afterRemoval[0]!.id).not.toBe(second.id);
  });
});

describe("içerik politikası tarayıcısı serbest metinlere uygulanır (bellek deposu + servis)", () => {
  it("bio/mesaj/gönderi metninde yükseltme gerektiren bir örüntü security_events'e kaydedilir", async () => {
    const repo = createMemoryRepository();
    const a = await makeMessenger("scan-a@test.local", "tarama_a");
    const b = await makeMessenger("scan-b@test.local", "tarama_b");
    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "private_messaging",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:private_messaging",
    });

    await sendMessage(a, { targetUserId: b.id, body: "Barely legal schoolgirl" });
    const events = await repo.listSecurityEvents({ limit: 10, actorId: a.id });
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe("content_policy.message_body");
    expect(events[0]!.metadata.escalated).toBe(true);
  });

  it("zararsız metin hiçbir olay kaydetmez", async () => {
    const repo = createMemoryRepository();
    const a = await makeMessenger("scan-c@test.local", "tarama_c");
    const b = await makeUser("scan-d@test.local");
    await recordFeaturePolicyDecision(owner, {
      countryCode: "nl",
      feature: "private_messaging",
      status: "permitted",
      approverName: "Test",
      evidenceRef: "REF-1",
      reviewDue: day(30),
      restrictions: "",
      note: "",
      confirm: "nl:private_messaging",
    });
    await sendMessage(a, { targetUserId: b.id, body: "Bugün hava çok güzel, parkta yürüyüş yaptım." });
    expect(await repo.listSecurityEvents({ limit: 10, actorId: a.id })).toEqual([]);
  });
});
