import "server-only";
import { randomUUID } from "node:crypto";
import { approvalBlocker, checkUploadRequest, hammingDistance, isPubliclyDeliverable, mediaLimits, NEAR_DUPLICATE_THRESHOLD } from "@/domain/media";
import { effectiveStatus } from "@/domain/subscriptions";
import type { Admin, MediaModeration, MediaOwnershipSource, ProfileMedia } from "@/domain/types";
import { getRepository } from "../repositories";
import { getStorage, type UploadTarget } from "../storage";
import { audit } from "./audit";
import { DomainError } from "./errors";
import { processGalleryImage, sniffImageType } from "./images";
import { parseMp4Metadata, sniffVideo } from "./video";

const MB = 1024 * 1024;
const POSTER_MAX_BYTES = 3 * MB;

async function mustGetMedia(id: string): Promise<ProfileMedia> {
  const m = await getRepository().getMedia(id);
  if (!m) throw new DomainError("Medya bulunamadı", "not_found");
  return m;
}

/** Profilin paket kotası (MB) ve kullanımı (bayt). Adet sınırı yoktur. */
export async function mediaUsage(profileId: string, now = new Date()) {
  const repo = getRepository();
  const [subs, plans, media] = await Promise.all([repo.listSubscriptions({ profileId }), repo.listPlans(), repo.listMedia(profileId)]);
  const active = subs.find((s) => effectiveStatus(s, now) === "active");
  const plan = plans.find((p) => p.id === active?.planId) ?? plans.find((p) => p.code === "basic");
  const quotaBytes = (plan?.storageQuotaMb ?? 300) * MB;
  const usedBytes = media.reduce((sum, m) => sum + m.bytes, 0);
  return { usedBytes, quotaBytes, planName: plan?.name ?? "Basic", count: media.length };
}

export type UploadRequest = {
  mimeType: string;
  bytes: number;
  fileName: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  posterBytes?: number | null;
};

export type UploadTicket = { mediaId: string; target: UploadTarget; posterTarget: UploadTarget | null };

/**
 * 1. adım — yükleme talebi: beyan edilen tür/boyut/süre ve kota kontrol edilir,
 * "uploading" durumunda bir kayıt açılır ve özel depoya imzalı yükleme adresi verilir.
 */
export async function requestUpload(actor: Admin, profileId: string, req: UploadRequest): Promise<UploadTicket> {
  const repo = getRepository();
  if (!(await repo.getProfile(profileId))) throw new DomainError("Profil bulunamadı");
  const limits = mediaLimits();
  const usage = await mediaUsage(profileId);
  const check = checkUploadRequest(req, usage, limits);
  if (!check.ok) throw new DomainError(check.reason);
  if (check.kind === "video" && req.posterBytes && req.posterBytes > POSTER_MAX_BYTES) throw new DomainError("Poster görseli çok büyük");

  const storage = getStorage();
  const id = randomUUID();
  const ext = check.kind === "image" ? (req.mimeType.split("/")[1] ?? "bin").replace("jpeg", "jpg") : req.mimeType === "video/webm" ? "webm" : "mp4";
  const originalPath = `${profileId}/${id}/original.${ext}`;
  const posterPath = check.kind === "video" && req.posterBytes ? `${profileId}/${id}/poster-original.jpg` : null;
  const existing = await repo.listMedia(profileId);

  const media = await repo.addMedia({
    profileId,
    kind: check.kind,
    status: "uploading",
    storagePath: originalPath,
    thumbPath: posterPath,
    publicUrl: null,
    publicPosterUrl: null,
    publicPaths: [],
    mimeType: req.mimeType,
    bytes: req.bytes,
    width: Math.max(1, Math.round(req.width ?? 1)),
    height: Math.max(1, Math.round(req.height ?? 1)),
    durationSeconds: req.durationSeconds ?? null,
    alt: req.fileName.replace(/\.[a-z0-9]+$/i, "").slice(0, 120),
    position: existing.length,
    isCover: !existing.some((m) => m.kind === "image") && check.kind === "image",
    rightsConfirmed: false,
    ownershipSource: null,
    ownershipNote: null,
    rightsConfirmedBy: null,
    rightsConfirmedAt: null,
    moderation: "pending",
    moderatedBy: null,
    moderatedAt: null,
    sha256: null,
    dhash: null,
    failureReason: null,
  });
  const maxBytes = check.kind === "image" ? limits.maxImageBytes : limits.maxVideoBytes;
  const [target, posterTarget] = await Promise.all([
    storage.createUploadTarget(originalPath, req.mimeType, maxBytes),
    posterPath ? storage.createUploadTarget(posterPath, "image/jpeg", POSTER_MAX_BYTES) : Promise.resolve(null),
  ]);
  await audit(actor, "media.upload_requested", "profile", profileId, { mediaId: media.id, kind: check.kind, bytes: req.bytes });
  return { mediaId: media.id, target, posterTarget };
}

/**
 * 2. adım — işleme: dosya özel depodan okunur ve İÇERİĞİNE göre doğrulanır
 * (istemcinin beyanına güvenilmez).
 * - Görsel: EXIF/GPS silinir, ≤2400px WebP + 480px önizleme üretilir, orijinal silinir,
 *   aynı dosya (SHA-256) reddedilir, benzer görsel (dHash) uyarı olarak işaretlenir.
 * - Video: konteyner (MP4/WebM) doğrulanır; MP4'te süre ve boyut dosyadan okunur;
 *   poster yüklendiyse WebP'ye dönüştürülür. Dönüştürme (transcoding) yapılmaz.
 */
export async function finalizeUpload(actor: Admin, mediaId: string): Promise<{ media: ProfileMedia; warning: string | null }> {
  const repo = getRepository();
  const storage = getStorage();
  const m = await mustGetMedia(mediaId);
  if (m.status !== "uploading") throw new DomainError("Bu medya zaten işlenmiş");
  await repo.updateMedia(m.id, { status: "processing" });
  const limits = mediaLimits();
  const fail = async (reason: string) => {
    await storage.removePrivate([m.storagePath, ...(m.thumbPath ? [m.thumbPath] : [])]);
    const failed = await repo.updateMedia(m.id, { status: "failed", failureReason: reason, bytes: 0 });
    await audit(actor, "media.processing_failed", "profile", m.profileId, { mediaId: m.id, reason });
    return { media: failed, warning: reason };
  };

  const data = await storage.readPrivate(m.storagePath);
  if (!data) return fail("Dosya yüklenmedi veya bulunamadı");

  if (m.kind === "image") {
    if (!sniffImageType(data)) return fail("Dosya içeriği geçerli bir görsel değil");
    let processed;
    try {
      processed = await processGalleryImage(data, limits.maxImageBytes);
    } catch (e) {
      return fail(e instanceof DomainError ? e.message : "Görsel işlenemedi");
    }
    const siblings = (await repo.listMedia(m.profileId)).filter((x) => x.id !== m.id && x.status === "ready" && x.kind === "image");
    if (siblings.some((x) => x.sha256 === processed.sha256)) return fail("Bu görsel bu profilde zaten var (aynı dosya)");
    const similar = siblings.find((x) => x.dhash && hammingDistance(x.dhash, processed.dhash) <= NEAR_DUPLICATE_THRESHOLD);
    const base = m.storagePath.replace(/original\.[a-z]+$/, "");
    const fullPath = `${base}full.webp`;
    const thumbPath = `${base}thumb.webp`;
    await Promise.all([
      storage.writePrivate(fullPath, processed.full.data, "image/webp"),
      storage.writePrivate(thumbPath, processed.thumb.data, "image/webp"),
    ]);
    await storage.removePrivate([m.storagePath]);
    const media = await repo.updateMedia(m.id, {
      status: "ready",
      storagePath: fullPath,
      thumbPath,
      mimeType: "image/webp",
      bytes: processed.full.data.length + processed.thumb.data.length,
      width: processed.full.width,
      height: processed.full.height,
      sha256: processed.sha256,
      dhash: processed.dhash,
    });
    const warning = similar ? "Bu görsel galerideki başka bir görsele çok benziyor; tekrar olup olmadığını kontrol edin." : null;
    await audit(actor, "media.processed", "profile", m.profileId, { mediaId: m.id, kind: "image", nearDuplicate: Boolean(similar) });
    return { media, warning };
  }

  // Video
  if (data.length > limits.maxVideoBytes) return fail("Video boyut sınırını aşıyor");
  const container = sniffVideo(data);
  if (!container) return fail("Dosya içeriği desteklenen bir video değil (MP4 veya WebM)");
  const meta = container === "video/mp4" ? parseMp4Metadata(data) : { durationSeconds: null, width: null, height: null };
  const duration = meta.durationSeconds ?? m.durationSeconds;
  if (duration != null && duration > limits.maxVideoSeconds) return fail(`Video en fazla ${Math.round(limits.maxVideoSeconds / 60)} dakika olabilir`);

  let thumbPath: string | null = null;
  let extraBytes = 0;
  if (m.thumbPath) {
    const poster = await storage.readPrivate(m.thumbPath);
    if (poster && sniffImageType(poster)) {
      try {
        const p = await processGalleryImage(poster, POSTER_MAX_BYTES);
        thumbPath = m.storagePath.replace(/original\.[a-z0-9]+$/, "poster.webp");
        await storage.writePrivate(thumbPath, p.full.data, "image/webp");
        extraBytes = p.full.data.length;
      } catch {
        thumbPath = null;
      }
    }
    await storage.removePrivate([m.thumbPath]);
  }
  const media = await repo.updateMedia(m.id, {
    status: "ready",
    mimeType: container,
    bytes: data.length + extraBytes,
    width: meta.width ?? m.width,
    height: meta.height ?? m.height,
    durationSeconds: duration,
    thumbPath,
  });
  await audit(actor, "media.processed", "profile", m.profileId, { mediaId: m.id, kind: "video", durationSeconds: duration });
  return { media, warning: thumbPath ? null : "Poster görseli üretilemedi; video oynatıcı nötr bir arka planla gösterilecek." };
}

/** Sahiplik / kullanım hakkı kaydı (yayın onayından ayrı tutulur). */
export async function setMediaRights(
  actor: Admin,
  mediaId: string,
  input: { confirmed: boolean; source: MediaOwnershipSource | null; note: string | null },
) {
  const repo = getRepository();
  const m = await mustGetMedia(mediaId);
  if (input.confirmed) {
    if (!input.source) throw new DomainError("Sahiplik kaynağını seçin");
    const consents = await repo.listConsents(m.profileId);
    if (!consents.some((c) => c.type === "photo_rights" && !c.revokedAt)) throw new DomainError("Önce profil için fotoğraf/medya kullanım izni kaydedilmeli");
  }
  const now = new Date().toISOString();
  await repo.updateMedia(m.id, {
    rightsConfirmed: input.confirmed,
    ownershipSource: input.confirmed ? input.source : null,
    ownershipNote: input.confirmed ? (input.note?.slice(0, 300) ?? null) : null,
    rightsConfirmedBy: input.confirmed ? actor.id : null,
    rightsConfirmedAt: input.confirmed ? now : null,
    // Hak kaydı geri alınırsa yayın onayı da düşer
    ...(input.confirmed ? {} : { moderation: "pending" as const, moderatedBy: null, moderatedAt: null }),
  });
  await audit(actor, input.confirmed ? "media.rights_confirmed" : "media.rights_revoked", "profile", m.profileId, { mediaId, source: input.source });
  await syncPublicMedia(m.profileId);
}

/** Yayın onayı / reddi (toplu). Onay; işlenmiş dosya ve hak kaydı gerektirir. */
export async function moderateMedia(actor: Admin, mediaIds: string[], decision: Exclude<MediaModeration, "pending">) {
  if (!mediaIds.length) throw new DomainError("Medya seçin");
  if (mediaIds.length > 200) throw new DomainError("Tek seferde en fazla 200 medya");
  const repo = getRepository();
  const items = await Promise.all(mediaIds.map(mustGetMedia));
  if (decision === "approved") {
    const blocked = items.map((m) => approvalBlocker(m)).find(Boolean);
    if (blocked) throw new DomainError(blocked);
  }
  const now = new Date().toISOString();
  for (const m of items) {
    await repo.updateMedia(m.id, { moderation: decision, moderatedBy: actor.id, moderatedAt: now });
    await audit(actor, `media.${decision}`, "profile", m.profileId, { mediaId: m.id });
  }
  for (const pid of new Set(items.map((m) => m.profileId))) await syncPublicMedia(pid);
  return items.length;
}

export async function setCover(actor: Admin, mediaId: string) {
  const repo = getRepository();
  const m = await mustGetMedia(mediaId);
  if (m.kind !== "image") throw new DomainError("Kapak yalnızca fotoğraf olabilir");
  for (const x of await repo.listMedia(m.profileId)) if (x.isCover !== (x.id === m.id)) await repo.updateMedia(x.id, { isCover: x.id === m.id });
  await audit(actor, "media.cover", "profile", m.profileId, { mediaId });
}

/** Sıralama: verilen kimlik listesi yeni sırayı belirler (eksik/yabancı kimlik reddedilir). */
export async function reorderMedia(actor: Admin, profileId: string, orderedIds: string[]) {
  const repo = getRepository();
  const items = await repo.listMedia(profileId);
  const known = new Set(items.map((m) => m.id));
  if (orderedIds.length !== items.length || orderedIds.some((id) => !known.has(id))) throw new DomainError("Geçersiz sıralama");
  await Promise.all(orderedIds.map((id, i) => repo.updateMedia(id, { position: i })));
  await audit(actor, "media.reorder", "profile", profileId, { count: orderedIds.length });
}

export async function updateMediaAlt(actor: Admin, mediaId: string, alt: string) {
  const m = await mustGetMedia(mediaId);
  const clean = alt.replace(/[<>]/g, "").trim().slice(0, 160);
  await getRepository().updateMedia(m.id, { alt: clean });
  await audit(actor, "media.alt", "profile", m.profileId, { mediaId });
}

export async function deleteMedia(actor: Admin, mediaId: string) {
  const repo = getRepository();
  const storage = getStorage();
  const m = await mustGetMedia(mediaId);
  if (m.publicPaths.length) await storage.unpublish(m.publicPaths);
  const own = [m.storagePath, m.thumbPath].filter((p): p is string => Boolean(p) && !p!.startsWith("demo/"));
  if (own.length) await storage.removePrivate(own);
  await repo.deleteMedia(m.id);
  const rest = (await repo.listMedia(m.profileId)).sort((a, b) => a.position - b.position);
  await Promise.all(rest.map((x, i) => (x.position !== i ? repo.updateMedia(x.id, { position: i }) : null)));
  if (m.isCover) {
    const next = rest.find((x) => x.kind === "image");
    if (next) await repo.updateMedia(next.id, { isCover: true });
  }
  await audit(actor, "media.delete", "profile", m.profileId, { mediaId, kind: m.kind });
}

/**
 * Kamuya açık kopyaları profil ve medya durumuyla eşitler:
 * - Profil yayında + medya onaylı/hazır/haklı → herkese açık kopya oluşturulur.
 * - Aksi halde varsa herkese açık kopya SİLİNİR.
 * Böylece yayında olmayan profillerin ve onaysız medyanın dosyaları hiçbir
 * zaman herkese açık depoda bulunmaz.
 */
export async function syncPublicMedia(profileId: string) {
  const repo = getRepository();
  const storage = getStorage();
  const profile = await repo.getProfile(profileId);
  const published = profile?.status === "published";
  for (const m of await repo.listMedia(profileId)) {
    const shouldBePublic = published && m.status === "ready" && m.rightsConfirmed && m.moderation === "approved";
    if (shouldBePublic && !m.publicUrl) {
      if (m.storagePath.startsWith("demo/")) {
        // Demo varlıkları zaten statik olarak sunulur
        await repo.updateMedia(m.id, { publicUrl: `/${m.storagePath}`, publicPosterUrl: m.thumbPath && m.kind === "video" ? `/${m.thumbPath}` : null });
        continue;
      }
      const main = await storage.publish(m.storagePath, m.mimeType);
      const poster = m.kind === "video" && m.thumbPath ? await storage.publish(m.thumbPath, "image/webp") : null;
      await repo.updateMedia(m.id, {
        publicUrl: main.url,
        publicPosterUrl: poster?.url ?? null,
        publicPaths: [main.publicPath, ...(poster ? [poster.publicPath] : [])],
      });
    } else if (!shouldBePublic && (m.publicUrl || m.publicPaths.length)) {
      if (m.publicPaths.length) await storage.unpublish(m.publicPaths);
      await repo.updateMedia(m.id, { publicUrl: null, publicPosterUrl: null, publicPaths: [] });
    }
  }
}

/** Profil silinirken tüm medya dosyalarını (özel + herkese açık) kaldırır. */
export async function purgeProfileMedia(profileId: string) {
  const storage = getStorage();
  const items = await getRepository().listMedia(profileId);
  const pub = items.flatMap((m) => m.publicPaths);
  const priv = items.flatMap((m) => [m.storagePath, m.thumbPath]).filter((p): p is string => Boolean(p) && !p!.startsWith("demo/"));
  if (pub.length) await storage.unpublish(pub);
  if (priv.length) await storage.removePrivate(priv);
}

/** Yönetim önizlemeleri: özel dosyalar için kısa ömürlü adresler. */
export async function previewUrls(items: ProfileMedia[], expiresInSeconds = 3600): Promise<Record<string, { src: string; thumb: string | null }>> {
  const storage = getStorage();
  const out: Record<string, { src: string; thumb: string | null }> = {};
  await Promise.all(
    items.map(async (m) => {
      if (m.status !== "ready") return;
      const sign = (p: string) => (p.startsWith("demo/") ? Promise.resolve(`/api/admin/media?path=${encodeURIComponent(p)}`) : storage.signedUrl(p, expiresInSeconds));
      out[m.id] = { src: await sign(m.storagePath), thumb: m.thumbPath ? await sign(m.thumbPath) : null };
    }),
  );
  return out;
}

export { isPubliclyDeliverable };
