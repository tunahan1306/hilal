"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { consentInputSchema, profileInputSchema, seoPageInputSchema, verificationInputSchema } from "@/domain/schemas";
import { slugifyTr } from "@/domain/text";
import type { Admin, ContactStatus, PrivacyRequestStatus } from "@/domain/types";
import { CONTACT_STATUSES } from "@/domain/types";
import { AuthorizationError, assertAdmin } from "@/server/auth/session";
import { invalidatePublic } from "@/server/cache";
import { getRepository } from "@/server/repositories";
import { audit } from "@/server/services/audit";
import { DomainError } from "@/server/services/errors";
import * as profiles from "@/server/services/profiles";
import * as moderation from "@/server/services/moderation";
import * as subscriptions from "@/server/services/subscriptions";
import { updatePrivacyRequestStatus } from "@/server/services/privacy";
import { markContactMessageUnread, updateContactMessageStatus } from "@/server/services/contact";

export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string[]>; data?: unknown } | null;

/**
 * Tüm yönetim işlemleri bu sarmalayıcıdan geçer: sunucu tarafında yönetici +
 * MFA doğrulaması, hata eşleme ve kamu önbelleğinin geçersiz kılınması.
 * CSRF: Server Action'lar Next.js tarafından Origin/Host eşleşmesiyle korunur;
 * oturum çerezi SameSite=Strict'tir.
 */
async function run(fn: (admin: Admin) => Promise<string | { message: string; data?: unknown }>, opts: { invalidate?: boolean } = { invalidate: true }): Promise<ActionResult> {
  let admin: Admin;
  try {
    admin = await assertAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: "Oturumunuz sona erdi. Lütfen yeniden giriş yapın." };
    throw e;
  }
  try {
    const out = await fn(admin);
    if (opts.invalidate !== false) invalidatePublic("seo");
    return typeof out === "string" ? { ok: true, message: out } : { ok: true, ...out };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, message: "Formdaki hataları düzeltin.", errors: z.flattenError(e).fieldErrors as Record<string, string[]> };
    if (e instanceof DomainError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Beklenmeyen bir hata oluştu." };
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function profilePayload(fd: FormData) {
  return profileInputSchema.parse({
    nickname: str(fd, "nickname"),
    birthDate: str(fd, "birthDate"),
    provincePlate: str(fd, "provincePlate"),
    districtSlug: str(fd, "districtSlug") || undefined,
    bio: str(fd, "bio"),
    whatsappPhone: str(fd, "whatsappPhone"),
    whatsappConsent: fd.get("whatsappConsent") === "true",
    interestIds: fd.getAll("interestIds").map(String),
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
    noindex: fd.get("noindex") === "on" || fd.get("noindex") === "true",
  });
}

// ---------------------------------------------------------------------------
// Profiller
// ---------------------------------------------------------------------------
export async function createProfileAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  let createdId: string | null = null;
  const res = await run(async (admin) => {
    const p = await profiles.createProfile(admin, profilePayload(fd));
    createdId = p.id;
    return "Profil taslak olarak oluşturuldu.";
  }, { invalidate: false });
  if (res?.ok && createdId) redirect(`/admin/profiller/${createdId}?yeni=1`);
  return res;
}

export async function updateProfileAction(id: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const { requeued } = await profiles.updateProfile(admin, id, profilePayload(fd));
    return requeued ? "Kaydedildi. İçerik değiştiği için profil yeniden moderasyona alındı." : "Kaydedildi.";
  });
}

export async function profileStatusAction(id: string, op: "review" | "publish" | "unpublish" | "archive" | "draft", reason?: string): Promise<ActionResult> {
  return run(async (admin) => {
    switch (op) {
      case "review": await profiles.submitForReview(admin, id); return "Profil incelemeye gönderildi.";
      case "publish": await profiles.publishProfile(admin, id); return "Profil yayınlandı.";
      case "unpublish": await profiles.unpublishProfile(admin, id, reason || "Yönetici kararı"); return "Profil yayından kaldırıldı.";
      case "archive": await profiles.archiveProfile(admin, id); return "Profil arşivlendi.";
      case "draft": await profiles.restoreToDraft(admin, id); return "Profil taslağa alındı.";
    }
  });
}

export async function moderateProfileAction(id: string, decision: "approved" | "rejected", note: string): Promise<ActionResult> {
  return run(async (admin) => {
    await profiles.setModeration(admin, id, decision, note.trim() || null);
    return decision === "approved" ? "Moderasyon onaylandı." : "Profil reddedildi.";
  });
}

export async function deleteProfileAction(id: string, confirmSlug: string, reason: string): Promise<ActionResult> {
  const res = await run(async (admin) => {
    const p = await getRepository().getProfile(id);
    if (!p || p.slug !== confirmSlug.trim()) throw new DomainError("Onay için profil slug'ını doğru yazın.");
    if (reason.trim().length < 5) throw new DomainError("Silme gerekçesi girin.");
    await profiles.deleteProfilePermanently(admin, id, reason.trim());
    return "Profil ve ilişkili tüm veriler kalıcı olarak silindi.";
  });
  if (res?.ok) redirect("/admin/profiller?silindi=1");
  return res;
}

export async function exportProfileAction(id: string): Promise<ActionResult> {
  return run(async (admin) => ({ message: "Dışa aktarma hazır.", data: await profiles.exportProfileData(admin, id) }), { invalidate: false });
}

// ---------------------------------------------------------------------------
// Görseller
// ---------------------------------------------------------------------------
export async function uploadImageAction(profileId: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("Dosya seçin.");
    await profiles.uploadProfileImage(admin, profileId, Buffer.from(await file.arrayBuffer()), str(fd, "alt"));
    return "Fotoğraf yüklendi. Yayında görünmesi için kullanım hakkını doğrulayın.";
  });
}

export async function imageAction(profileId: string, imageId: string, op: "confirm" | "unconfirm" | "delete" | "up" | "down"): Promise<ActionResult> {
  return run(async (admin) => {
    if (op === "confirm" || op === "unconfirm") await profiles.confirmImageRights(admin, profileId, imageId, op === "confirm");
    else if (op === "delete") await profiles.deleteProfileImage(admin, profileId, imageId);
    else await profiles.moveProfileImage(admin, profileId, imageId, op === "up" ? -1 : 1);
    return "Güncellendi.";
  });
}

// ---------------------------------------------------------------------------
// Rıza ve doğrulama
// ---------------------------------------------------------------------------
async function optionalFile(fd: FormData, key: string): Promise<Buffer | undefined> {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? Buffer.from(await f.arrayBuffer()) : undefined;
}

export async function consentAction(profileId: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const input = consentInputSchema.parse({ type: str(fd, "type"), method: str(fd, "method") });
    await profiles.recordConsent(admin, profileId, input.type, input.method, await optionalFile(fd, "evidence"));
    return "Rıza kaydı eklendi.";
  });
}

export async function revokeConsentAction(profileId: string, consentId: string): Promise<ActionResult> {
  return run(async (admin) => {
    await profiles.revokeConsent(admin, profileId, consentId);
    return "Rıza geri alındı. Gerekiyorsa profil yayından kaldırıldı.";
  });
}

export async function verificationAction(profileId: string, _p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const input = verificationInputSchema.parse({ type: str(fd, "type"), status: str(fd, "status"), method: str(fd, "method"), note: str(fd, "note") || undefined });
    await profiles.recordVerification(admin, profileId, input, await optionalFile(fd, "document"));
    return "Doğrulama kaydı eklendi.";
  });
}

// ---------------------------------------------------------------------------
// Şikâyetler
// ---------------------------------------------------------------------------
export async function reportAction(id: string, op: "review" | "remove" | "keep" | "appeal" | "appeal-accept" | "appeal-reject", note: string): Promise<ActionResult> {
  return run(async (admin) => {
    switch (op) {
      case "review": await moderation.startReview(admin, id); return "İncelemeye alındı.";
      case "remove": await moderation.resolveReport(admin, id, "remove", note); return "İçerik kaldırıldı.";
      case "keep": await moderation.resolveReport(admin, id, "keep", note); return "Şikâyet reddedildi.";
      case "appeal": await moderation.recordAppeal(admin, id, note); return "İtiraz kaydedildi.";
      case "appeal-accept": await moderation.decideAppeal(admin, id, true, note); return "İtiraz kabul edildi.";
      case "appeal-reject": await moderation.decideAppeal(admin, id, false, note); return "İtiraz reddedildi.";
    }
  });
}

// ---------------------------------------------------------------------------
// Abonelikler
// ---------------------------------------------------------------------------
export async function createSubscriptionAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    await subscriptions.createSubscription(admin, {
      profileId: str(fd, "profileId"),
      planId: str(fd, "planId"),
      startsAt: str(fd, "startsAt"),
      months: str(fd, "months"),
      autoRenew: fd.get("autoRenew") === "on",
      sponsored: fd.get("sponsored") === "on",
      note: str(fd, "note") || undefined,
    });
    return "Abonelik kaydı oluşturuldu (tahsilat yapılmadı).";
  });
}

export async function subscriptionAction(id: string, op: "renew" | "cancel", value: string): Promise<ActionResult> {
  return run(async (admin) => {
    if (op === "renew") {
      // "2", "2 ay" gibi girdileri kabul eder; geçersizse servis anlaşılır hata döndürür.
      await subscriptions.renewSubscription(admin, id, Number.parseInt(value.trim(), 10));
      return "Abonelik yenilendi.";
    }
    await subscriptions.cancelSubscription(admin, id, value || "Yönetici kararı");
    return "Abonelik iptal edildi.";
  });
}

// ---------------------------------------------------------------------------
// KVKK, SEO, ilgi alanları, ayarlar
// ---------------------------------------------------------------------------
export async function privacyStatusAction(id: string, status: PrivacyRequestStatus): Promise<ActionResult> {
  return run(async (admin) => {
    await updatePrivacyRequestStatus(admin, id, status);
    return "Başvuru durumu güncellendi.";
  }, { invalidate: false });
}

export async function contactStatusAction(id: string, status: ContactStatus): Promise<ActionResult> {
  return run(async (admin) => {
    if (!CONTACT_STATUSES.includes(status)) throw new DomainError("Geçersiz durum.");
    await updateContactMessageStatus(admin, id, status);
    return "Mesaj durumu güncellendi.";
  }, { invalidate: false });
}

export async function contactUnreadAction(id: string): Promise<ActionResult> {
  return run(async (admin) => {
    await markContactMessageUnread(admin, id);
    return "Mesaj okunmadı olarak işaretlendi.";
  }, { invalidate: false });
}

export async function seoPageAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const input = seoPageInputSchema.parse({
      path: str(fd, "path"),
      title: str(fd, "title") || undefined,
      description: str(fd, "description") || undefined,
      canonical: str(fd, "canonical") || undefined,
      indexOverride: str(fd, "indexOverride") || "auto",
      intro: str(fd, "intro") || undefined,
    });
    await getRepository().upsertSeoPage(input);
    await audit(admin, "seo.upsert", "seo_page", input.path, { index: input.indexOverride });
    return "SEO ayarları kaydedildi.";
  });
}

export async function interestAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const name = z.string().trim().min(2).max(40).parse(str(fd, "name"));
    const i = await getRepository().createInterest({ name, slug: slugifyTr(name), description: str(fd, "description").trim() || null });
    await audit(admin, "interest.create", "interest", i.id, { name });
    invalidatePublic("interests");
    return "İlgi alanı eklendi.";
  });
}

export async function deleteInterestAction(id: string): Promise<ActionResult> {
  return run(async (admin) => {
    await getRepository().deleteInterest(id);
    await audit(admin, "interest.delete", "interest", id);
    invalidatePublic("interests");
    return "İlgi alanı silindi.";
  });
}

export async function settingsAction(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async (admin) => {
    const input = z
      .object({ siteName: z.string().trim().min(2).max(60), supportEmail: z.email(), reportsEnabled: z.boolean() })
      .parse({ siteName: str(fd, "siteName"), supportEmail: str(fd, "supportEmail"), reportsEnabled: fd.get("reportsEnabled") === "on" });
    await getRepository().updateSiteSettings(input);
    await audit(admin, "settings.update", "site_settings", null, input);
    return "Ayarlar kaydedildi.";
  });
}
