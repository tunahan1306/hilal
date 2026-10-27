import "server-only";
import { z } from "zod";
import { isAdult } from "@/domain/age";
import { COUNTRY_CODES, type CountryCode } from "@/domain/countries";
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
import { DomainError } from "./errors";

export const createUserProfileInputSchema = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/, "Kullanıcı adı yalnızca küçük harf, rakam ve alt çizgi içerebilir (3-30 karakter)"),
  displayName: z.string().trim().min(1, "Görünen ad gerekli").max(60),
  bio: z.string().trim().max(2000).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG formatında olmalı"),
  countryCode: z.enum(COUNTRY_CODES),
});
export type CreateUserProfileInput = z.input<typeof createUserProfileInputSchema>;

export const updateUserProfileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Görünen ad gerekli").max(60).optional(),
  bio: z.string().trim().max(2000).optional(),
  visibility: z.enum(["public", "followers_only", "private"]).optional(),
});
export type UpdateUserProfileInput = z.input<typeof updateUserProfileInputSchema>;

/** Profil oluşturma — tek kullanıcı tek profil; 18 yaş altı reddedilir (admin ürünüyle aynı kural). */
export async function createOwnProfile(actor: AppUser, raw: CreateUserProfileInput, now = new Date()): Promise<UserProfile> {
  const input = createUserProfileInputSchema.parse(raw);
  const repo = getRepository();
  if (await repo.getUserProfileByUserId(actor.id)) throw new DomainError("Zaten bir profiliniz var", "profile_exists");
  if (await repo.getUserProfileByHandle(input.handle)) throw new DomainError("Bu kullanıcı adı alınmış", "handle_taken");
  if (!isAdult(input.birthDate, now)) throw new DomainError("18 yaşından küçükler hesap oluşturamaz", "underage");
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
  return repo.updateUserProfile(actor.id, input);
}

export const followInputSchema = z.object({ targetUserId: z.uuid() });
export type FollowInput = z.input<typeof followInputSchema>;

export async function followUser(actor: AppUser, raw: FollowInput): Promise<void> {
  const { targetUserId } = followInputSchema.parse(raw);
  const repo = getRepository();
  const blocks = await repo.listBlocksInvolving(actor.id);
  if (!canFollow(actor.id, targetUserId, blocks)) throw new DomainError("Bu kullanıcıyı takip edemezsiniz", "cannot_follow");
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
  await repo.addBlock(actor.id, targetUserId);
  await repo.removeFollow(actor.id, targetUserId);
  await repo.removeFollow(targetUserId, actor.id);
}

export async function unblockUser(actor: AppUser, raw: BlockInput): Promise<void> {
  const { targetUserId } = blockInputSchema.parse(raw);
  await getRepository().removeBlock(actor.id, targetUserId);
}

export const sendMessageInputSchema = z.object({ targetUserId: z.uuid(), body: z.string().trim().min(1, "Mesaj boş olamaz").max(4000) });
export type SendMessageInput = z.input<typeof sendMessageInputSchema>;

/**
 * Mesaj gönderme — PolicyGate'e göre ülkede private_messaging izinli değilse engellenir
 * (veritabanı bugün bu özellik için bir görünürlük kapısı uygulamıyor, çünkü mesajlar
 * kamuya açık değil; asıl risk engellenmiş bir tarafa mesaj gönderebilmek — bu da RLS'e ek
 * olarak messages_block_guard tetikleyicisiyle veritabanı seviyesinde de uygulanıyor).
 */
export async function sendMessage(actor: AppUser, raw: SendMessageInput): Promise<Message> {
  const { targetUserId, body } = sendMessageInputSchema.parse(raw);
  const repo = getRepository();
  const senderProfile = await repo.getUserProfileByUserId(actor.id);
  if (senderProfile) {
    const permitted = await getPolicyGate().isPermitted(senderProfile.countryCode as (typeof COUNTRY_CODES)[number], "private_messaging");
    if (!permitted) throw new DomainError("Bu ülkede mesajlaşma özelliği henüz izinli değil", "feature_not_permitted");
  }
  const blocks = await repo.listBlocksInvolving(actor.id);
  if (isBlockedEitherWay(blocks, actor.id, targetUserId)) throw new DomainError("Bu kullanıcıyla mesajlaşamazsınız", "blocked");
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
  body: z.string().trim().max(4000),
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
  if (!input.body && input.mediaAssetIds.length === 0) throw new DomainError("Gönderi boş olamaz", "empty_post");
  const repo = getRepository();
  for (const id of input.mediaAssetIds) {
    const media = await repo.getMediaAsset(id);
    if (!media || media.ownerId !== actor.id) throw new DomainError("Medya bulunamadı", "not_found");
  }
  if (input.paid) {
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
