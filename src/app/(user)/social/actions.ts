"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertUser } from "@/server/auth/user-session";
import { DomainError } from "@/server/services/errors";
import { logError } from "@/server/log";
import { clientFingerprint } from "@/server/rate-limit";
import { submitContentReport } from "@/server/services/content-moderation";
import {
  blockUser,
  createOwnProfile,
  createPost,
  followUser,
  markNotificationRead,
  sendMessage,
  unblockUser,
  unfollowUser,
  updateOwnProfile,
  uploadMediaAsset,
} from "@/server/services/social";

export type SocialState = { message: string } | null;

async function run(fn: () => Promise<void | string>): Promise<SocialState> {
  try {
    const message = await fn();
    return message ? { message } : null;
  } catch (e) {
    if (e instanceof z.ZodError) return { message: e.issues[0]?.message ?? "Formdaki bilgileri kontrol edin." };
    if (e instanceof DomainError) return { message: e.message };
    logError("social.action", e);
    return { message: "Beklenmeyen bir hata oluştu." };
  }
}

export async function createProfileAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  const result = await run(async () => {
    const actor = await assertUser();
    await createOwnProfile(actor, {
      handle: String(formData.get("handle") ?? ""),
      displayName: String(formData.get("displayName") ?? ""),
      bio: String(formData.get("bio") ?? "") || undefined,
      birthDate: String(formData.get("birthDate") ?? ""),
      countryCode: String(formData.get("countryCode") ?? "") as "tr",
    });
  });
  if (!result) redirect("/hesap");
  return result;
}

export async function updateProfileVisibilityAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    const visibility = String(formData.get("visibility") ?? "private") as "public" | "followers_only" | "private";
    await updateOwnProfile(actor, { visibility });
    return `Görünürlük "${visibility}" olarak güncellendi.`;
  });
}

export async function followAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    await followUser(actor, { targetUserId: String(formData.get("targetUserId") ?? "") });
    return "Takip edildi.";
  });
}

export async function unfollowAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    await unfollowUser(actor, { targetUserId: String(formData.get("targetUserId") ?? "") });
    return "Takipten çıkıldı.";
  });
}

export async function blockAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    await blockUser(actor, { targetUserId: String(formData.get("targetUserId") ?? "") });
    return "Kullanıcı engellendi.";
  });
}

export async function unblockAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    await unblockUser(actor, { targetUserId: String(formData.get("targetUserId") ?? "") });
    return "Engel kaldırıldı.";
  });
}

export async function sendMessageAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    await sendMessage(actor, { targetUserId: String(formData.get("targetUserId") ?? ""), body: String(formData.get("body") ?? "") });
    return "Mesaj gönderildi.";
  });
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const actor = await assertUser();
  await markNotificationRead(actor, String(formData.get("notificationId") ?? ""));
}

/** Gönderi oluşturma — isteğe bağlı tek bir görsel eki; önce medya yüklenir, sonra gönderiye eklenir. */
export async function createPostAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const actor = await assertUser();
    const file = formData.get("file");
    const mediaAssetIds: string[] = [];
    if (file instanceof File && file.size > 0) {
      const media = await uploadMediaAsset(actor, Buffer.from(await file.arrayBuffer()));
      mediaAssetIds.push(media.id);
    }
    await createPost(actor, { body: String(formData.get("body") ?? ""), mediaAssetIds, paid: formData.get("paid") === "on" });
    return "Gönderi paylaşıldı.";
  });
}

/**
 * Modül B/C içeriği şikâyeti — admin-küratörlü keşif ürününün profil şikâyet formundan
 * AYRI (bkz. src/server/services/content-moderation.ts). Giriş gerektirmez; ziyaretçi de
 * bildirebilir (mevcut profil şikâyet akışıyla aynı duruş).
 */
export async function reportContentAction(_prev: SocialState, formData: FormData): Promise<SocialState> {
  return run(async () => {
    const fingerprint = await clientFingerprint();
    await submitContentReport(
      {
        contentType: String(formData.get("contentType") ?? "") as "post",
        contentId: String(formData.get("contentId") ?? ""),
        category: String(formData.get("category") ?? "other") as "other",
        description: String(formData.get("description") ?? ""),
      },
      fingerprint,
    );
    return "Bildiriminiz alındı; inceleniyor.";
  });
}
