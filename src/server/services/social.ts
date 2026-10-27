import "server-only";
import { z } from "zod";
import { isAdult } from "@/domain/age";
import { COUNTRY_CODES } from "@/domain/countries";
import { canFollow, isBlockedEitherWay, type Message, type Notification, type PublicUserProfile, type UserProfile } from "@/domain/social";
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
