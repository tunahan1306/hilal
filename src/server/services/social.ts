import "server-only";
import { z } from "zod";
import { isAdult } from "@/domain/age";
import { COUNTRY_CODES, type CountryCode } from "@/domain/countries";
import { requiresEscalation, scanText } from "@/domain/content-policy";
import { noHtml, trimmed } from "@/domain/schemas";
import { sharedRateLimit } from "../rate-limit";
import {
  allMediaRightsReviewed,
  isActiveCreatorAccount,
} from "@/domain/creator";
import {
  canFollow,
  isBlockedEitherWay,
  type MediaAsset,
  type Message,
  type Notification,
  type Post,
  type PublicPost,
  type PublicUserProfile,
  type UserProfile,
} from "@/domain/social";
import type { AppUser } from "@/domain/identity";
import { getPolicyGate } from "./policy";
import { getRepository } from "../repositories";
import { DomainError, RateLimitedError } from "./errors";

const HOUR = 3_600_000;
/** Mesajlaşma/gönderi gibi yüksek frekanslı yazma yolları için paylaşılan oran sınırı — moderation.ts/content-moderation.ts'teki aynı disiplin. */
export const MESSAGES_PER_HOUR = 60;
export const POSTS_PER_HOUR = 20;

export const createUserProfileInputSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "Kullanıcı adı yalnızca küçük harf, rakam ve alt çizgi içerebilir (3-30 karakter)"),
  displayName: trimmed(1, 60, "Görünen ad").refine(noHtml, "HTML karakterleri kullanılamaz"),
  bio: trimmed(0, 2000, "Hakkında").refine(noHtml, "HTML karakterleri kullanılamaz").optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG formatında olmalı"),
  countryCode: z.enum(COUNTRY_CODES),
});
export type CreateUserProfileInput = z.input<typeof createUserProfileInputSchema>;

export const updateUserProfileInputSchema = z.object({
  displayName: trimmed(1, 60, "Görünen ad").refine(noHtml, "HTML karakterleri kullanılamaz").optional(),
  bio: trimmed(0, 2000, "Hakkında").refine(noHtml, "HTML karakterleri kullanılamaz").optional(),
  visibility: z.enum(["public", "followers_only", "private"]).optional(),
});
export type UpdateUserProfileInput = z.input<typeof updateUserProfileInputSchema>;

/**
 * Serbest metin alanlarını (bio/mesaj/gönderi) içerik politikası tarayıcısından geçirir
 * (bkz. domain/content-policy.ts — admin-küratörlü ürünün profiles.ts'te kullandığı aynı
 * tarayıcı). Hiçbir yazmayı ENGELLEMEZ (admin ürünündeki aynı duruş: bulgular yalnızca
 * incelemeye düşer) — yalnızca security_events'e kaydeder, çünkü bu aktör bir app_user'dır ve
 * audit_logs.actor_id yalnızca admins(id)'e referans verir (bkz. Modül A security_events notu).
 */
async function logContentPolicyFindings(actorId: string, surface: string, text: string): Promise<void> {
  const findings = scanText(text);
  if (findings.length === 0) return;
  await getRepository().addSecurityEvent({
    eventType: `content_policy.${surface}`,
    actorType: "user",
    actorId,
    metadata: { findings: findings.map((f) => f.rule), escalated: requiresEscalation(findings) },
  });
}

/** Profil oluşturma — tek kullanıcı tek profil; 18 yaş altı reddedilir (admin ürünüyle aynı kural). */
export async function createOwnProfile(actor: AppUser, raw: CreateUserProfileInput, now = new Date()): Promise<UserProfile> {
  const input = createUserProfileInputSchema.parse(raw);
  const repo = getRepository();
  if (await repo.getUserProfileByUserId(actor.id)) throw new DomainError("Zaten bir profiliniz var", "profile_exists");
  if (await repo.getUserProfileByHandle(input.handle)) throw new DomainError("Bu kullanıcı adı alınmış", "handle_taken");
  if (!isAdult(input.birthDate, now)) throw new DomainError("18 yaşından küçükler hesap oluşturamaz", "underage");
  if (input.bio) await logContentPolicyFindings(actor.id, "user_profile_bio", input.bio);
  return repo.createUserProfile({
    userId: actor.id,
    handle: input.handle,
    displayName: input.displayName,
    bio: input.bio ?? null,
    birthDate: input.birthDate,
    countryCode: input.countryCode,
    visibility: "private",
  });
}

/**
 * Profil güncelleme — `visibility: "public"` istenirse önce PolicyGate'e sorulur (Server
 * Action katmanının "gated her yazma yolunun başında sorulur" kuralı, bkz.
 * docs/transformation/02c_MODULE_ARCHITECTURE.md §1). Politika kapalıysa profil sessizce
 * görünmez kalmaz — açık bir hata döner.
 */
export async function updateOwnProfile(actor: AppUser, raw: UpdateUserProfileInput): Promise<UserProfile> {
  const input = updateUserProfileInputSchema.parse(raw);
  const repo = getRepository();
  const profile = await repo.getUserProfileByUserId(actor.id);
  if (!profile) throw new DomainError("Profil bulunamadı", "not_found");
  if (input.visibility === "public") {
    const permitted = await getPolicyGate().isPermitted(profile.countryCode as (typeof COUNTRY_CODES)[number], "social_profiles");
    if (!permitted) throw new DomainError("Bu ülkede sosyal profil özelliği henüz izinli değil", "feature_not_permitted");
  }
  if (input.bio) await logContentPolicyFindings(actor.id, "user_profile_bio", input.bio);
  return repo.updateUserProfile(actor.id, input);
}

export const followInputSchema = z.object({ targetUserId: z.uuid() });
export type FollowInput = z.input<typeof followInputSchema>;

export async function followUser(actor: AppUser, raw: FollowInput): Promise<void> {
  const { targetUserId } = followInputSchema.parse(raw);
  const repo = getRepository();
  const blocks = await repo.listBlocksInvolving(actor.id);
  if (!canFollow(actor.id, targetUserId, blocks)) throw new DomainError("Bu kullanıcıyı takip edemezsiniz", "cannot_follow");
  // İdempotent: çift tıklama/tekrar gönderim aynı satırı iki kez eklemeye çalışmaz — Supabase'de
  // (follower_id, followee_id) birincil anahtarı yakalanmamış bir DbError'a yol açardı.
  if ((await repo.listFollowing(actor.id)).includes(targetUserId)) return;
  await repo.addFollow(actor.id, targetUserId);
  await repo.addNotification({ userId: targetUserId, type: "new_follower", payload: { followerId: actor.id } });
}

export async function unfollowUser(actor: AppUser, raw: FollowInput): Promise<void> {
  const { targetUserId } = followInputSchema.parse(raw);
  await getRepository().removeFollow(actor.id, targetUserId);
}

export const blockInputSchema = z.object({ targetUserId: z.uuid(), reason: z.string().trim().max(500).optional() });
export type BlockInput = z.input<typeof blockInputSchema>;

/** Engelleme karşılıklı takibi de temizler (iki yönde de) — engellenen biriyle takip ilişkisi kalmaz. */
export async function blockUser(actor: AppUser, raw: BlockInput): Promise<void> {
  const { targetUserId } = blockInputSchema.parse(raw);
  if (actor.id === targetUserId) throw new DomainError("Kendinizi engelleyemezsiniz", "cannot_block_self");
  const repo = getRepository();
  // İdempotent — aynı gerekçeyle (bkz. followUser): (blocker_id, blocked_id) birincil anahtarı.
  const alreadyBlocked = (await repo.listBlocksInvolving(actor.id)).some((b) => b.blockerId === actor.id && b.blockedId === targetUserId);
  if (!alreadyBlocked) await repo.addBlock(actor.id, targetUserId);
  await repo.removeFollow(actor.id, targetUserId);
  await repo.removeFollow(targetUserId, actor.id);
}

export async function unblockUser(actor: AppUser, raw: BlockInput): Promise<void> {
  const { targetUserId } = blockInputSchema.parse(raw);
  await getRepository().removeBlock(actor.id, targetUserId);
}

export const sendMessageInputSchema = z.object({ targetUserId: z.uuid(), body: trimmed(1, 4000, "Mesaj").refine(noHtml, "HTML karakterleri kullanılamaz") });
export type SendMessageInput = z.input<typeof sendMessageInputSchema>;

/**
 * Mesaj gönderme — PolicyGate'e göre ülkede private_messaging izinli değilse engellenir.
 * Fail-closed: gönderenin beyan edilmiş bir ülkesi (dolayısıyla sosyal profili) yoksa kapı
 * ATLANMAZ, reddedilir — ülke bilinmiyorsa Modül G'nin "bilinmeyen = kapalı" ilkesi burada da
 * geçerlidir (bkz. domain/policy.ts isFeaturePermitted). Veritabanı bugün bu özellik için ayrı
 * bir görünürlük kapısı uygulamıyor (mesajlar kamuya açık değil); asıl ek risk engellenmiş bir
 * tarafa mesaj gönderebilmek — bu da RLS'e ek olarak messages_block_guard tetikleyicisiyle
 * veritabanı seviyesinde de uygulanıyor.
 */
export async function sendMessage(actor: AppUser, raw: SendMessageInput): Promise<Message> {
  const { targetUserId, body } = sendMessageInputSchema.parse(raw);
  if (!(await sharedRateLimit(`message:${actor.id}`, MESSAGES_PER_HOUR, HOUR)).ok) throw new RateLimitedError();
  const repo = getRepository();
  const senderProfile = await repo.getUserProfileByUserId(actor.id);
  if (!senderProfile) throw new DomainError("Mesaj gönderebilmek için önce bir sosyal profil oluşturmalısınız", "profile_required");
  const permitted = await getPolicyGate().isPermitted(senderProfile.countryCode as (typeof COUNTRY_CODES)[number], "private_messaging");
  if (!permitted) throw new DomainError("Bu ülkede mesajlaşma özelliği henüz izinli değil", "feature_not_permitted");
  const blocks = await repo.listBlocksInvolving(actor.id);
  if (isBlockedEitherWay(blocks, actor.id, targetUserId)) throw new DomainError("Bu kullanıcıyla mesajlaşamazsınız", "blocked");
  await logContentPolicyFindings(actor.id, "message_body", body);
  const conversation = await repo.startOrGetConversation(actor.id, targetUserId);
  const message = await repo.addMessage({ conversationId: conversation.id, senderId: actor.id, body });
  await repo.addNotification({ userId: targetUserId, type: "new_message", payload: { conversationId: conversation.id, senderId: actor.id } });
  return message;
}

export async function listConversationMessages(actor: AppUser, conversationId: string, limit = 50): Promise<Message[]> {
  const repo = getRepository();
  const participants = await repo.listConversationParticipants(conversationId);
  if (!participants.includes(actor.id)) throw new DomainError("Bu konuşmaya erişiminiz yok", "forbidden");
  return repo.listMessages(conversationId, { limit });
}

export async function getOwnPublicProfile(actor: AppUser): Promise<PublicUserProfile | null> {
  return getRepository().getPublicUserProfile(actor.id);
}

export async function getPublicProfileByHandle(handle: string): Promise<PublicUserProfile | null> {
  const repo = getRepository();
  const profile = await repo.getUserProfileByHandle(handle);
  if (!profile) return null;
  return repo.getPublicUserProfile(profile.userId);
}

export async function listOwnNotifications(actor: AppUser): Promise<Notification[]> {
  return getRepository().listNotifications(actor.id);
}

export async function markNotificationRead(actor: AppUser, notificationId: string): Promise<void> {
  await getRepository().markNotificationRead(notificationId, actor.id);
}

// --- Modül B kapanışı + Modül C: medya/gönderi -------------------------------------
// bkz. domain/social.ts başlığı — posts/media_assets, content_rights ile birlikte ele alınır.

/** Görseli EXIF/GPS temizlenmiş, yeniden kodlanmış biçimde saklar (bkz. src/server/services/images.ts). Video bu sürümde desteklenmez. */
export async function uploadMediaAsset(actor: AppUser, data: Buffer): Promise<MediaAsset> {
  const { processUpload } = await import("./images");
  const processed = await processUpload(data);
  return getRepository().createMediaAsset({
    ownerId: actor.id,
    data: processed.data,
    contentType: processed.contentType,
    kind: "image",
    width: processed.width,
    height: processed.height,
    durationSeconds: null,
  });
}

export async function listOwnMediaAssets(actor: AppUser): Promise<MediaAsset[]> {
  return getRepository().listMediaAssetsByOwner(actor.id);
}

export const createPostInputSchema = z.object({
  body: trimmed(0, 4000, "Gönderi").refine(noHtml, "HTML karakterleri kullanılamaz"),
  mediaAssetIds: z.array(z.string().trim().min(1)).max(10).default([]),
  paid: z.boolean().default(false),
});
export type CreatePostInput = z.input<typeof createPostInputSchema>;

/**
 * Gönderi oluşturma. Ücretli (paid) gönderi yalnızca: (1) actor onaylı bir creator
 * hesabına sahipse, (2) ülkesinde "digital_content" özelliği izinliyse ve (3) eklenen
 * TÜM medya varlıklarının incelenmiş (reviewed_by dolu) bir content_rights kaydı varsa
 * oluşturulabilir — bu üç koşul posts_public view'ının okuma-zamanı kapısıyla aynı
 * kuralın yazma-zamanı önceden bildirimidir (bkz. 02a_DATA_MODEL.md "content_rights" notu).
 */
export async function createPost(actor: AppUser, raw: CreatePostInput): Promise<Post> {
  const input = createPostInputSchema.parse(raw);
  if (!(await sharedRateLimit(`post:${actor.id}`, POSTS_PER_HOUR, HOUR)).ok) throw new RateLimitedError();
  if (!input.body && input.mediaAssetIds.length === 0) throw new DomainError("Gönderi boş olamaz", "empty_post");
  const repo = getRepository();
  const ownedMedia = await Promise.all(input.mediaAssetIds.map((id) => repo.getMediaAsset(id)));
  if (ownedMedia.some((m) => !m || m.ownerId !== actor.id)) throw new DomainError("Medya bulunamadı", "not_found");
  if (input.body) await logContentPolicyFindings(actor.id, "post_body", input.body);
  if (input.paid) {
    // Sıfır medyalı ücretli gönderi: allMediaRightsReviewed([], ...) boş dizi için vacuous-true
    // döner, bu yüzden burada AYRICA kontrol edilir — aksi halde hak incelemesi kapısı hiç
    // görülmeden geçilir (posts_public view'ında da ikinci bir savunma hattı var, bkz. migration).
    if (input.mediaAssetIds.length === 0) throw new DomainError("Ücretli gönderi en az bir medya içermeli", "rights_not_reviewed");
    const creator = await repo.getCreatorAccountByUserId(actor.id);
    if (!isActiveCreatorAccount(creator)) throw new DomainError("Yalnızca onaylı creator hesabı ücretli gönderi paylaşabilir", "creator_not_active");
    const permitted = await getPolicyGate().isPermitted(creator!.countryCode as CountryCode, "digital_content");
    if (!permitted) throw new DomainError("Bu ülkede ücretli dijital içerik özelliği henüz izinli değil", "feature_not_permitted");
    const rights = await repo.listContentRightsForMediaAssets(input.mediaAssetIds);
    if (!allMediaRightsReviewed(input.mediaAssetIds, rights)) {
      throw new DomainError("Ücretli gönderi için eklenen tüm medyanın hak incelemesi tamamlanmış olmalı", "rights_not_reviewed");
    }
  }
  return repo.createPost({ authorId: actor.id, body: input.body, visibility: "public", paid: input.paid, mediaAssetIds: input.mediaAssetIds });
}

export async function listOwnPosts(actor: AppUser): Promise<Post[]> {
  return getRepository().listPostsByAuthor(actor.id);
}

/**
 * Herkese açık gönderi listesi — posts_public view'ının uygulama karşılığı (var/yok
 * görünürlüğü view'da zaten uygulanır); burada yalnızca abonesi olmayan bir izleyiciden
 * ücretli gönderinin GÖVDESİ gizlenir (var olduğu bilgisi gizlenmez, kilitli teaser olarak kalır).
 */
export async function getPublicPostsByHandle(handle: string, viewer: AppUser | null): Promise<(PublicPost & { locked: boolean })[]> {
  const repo = getRepository();
  const profile = await repo.getUserProfileByHandle(handle);
  if (!profile) return [];
  const posts = await repo.listPublicPostsByAuthor(profile.userId);
  if (!posts.some((p) => p.paid)) return posts.map((p) => ({ ...p, locked: false }));
  const creator = await repo.getCreatorAccountByUserId(profile.userId);
  const tiers = creator ? await repo.listSubscriptionTiersByCreator(creator.id) : [];
  let subscribed = false;
  if (viewer && tiers.length) {
    const subs = await repo.listCreatorSubscriptionsBySubscriber(viewer.id);
    subscribed = tiers.some((t) => subs.some((s) => s.tierId === t.id && s.status === "active"));
  }
  return posts.map((p) => (p.paid && !subscribed ? { ...p, body: "", locked: true } : { ...p, locked: false }));
}
