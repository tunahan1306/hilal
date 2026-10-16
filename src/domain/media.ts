/**
 * Medya kuralları — saf fonksiyonlar (UI, sunucu ve testler ortak kullanır).
 */
import type { MediaKind, ProfileMedia } from "./types";

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const VIDEO_MIME = ["video/mp4", "video/webm"] as const;

export type MediaLimits = {
  maxImageBytes: number;
  maxVideoBytes: number;
  maxVideoSeconds: number;
};

/** Ortam değişkenleriyle yapılandırılabilir sınırlar (MB / saniye). */
export function mediaLimits(env: Record<string, string | undefined> = process.env): MediaLimits {
  const num = (k: string, d: number) => {
    const n = Number(env[k]);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    maxImageBytes: num("MEDIA_MAX_IMAGE_MB", 20) * 1024 * 1024,
    maxVideoBytes: num("MEDIA_MAX_VIDEO_MB", 200) * 1024 * 1024,
    maxVideoSeconds: num("MEDIA_MAX_VIDEO_SECONDS", 180),
  };
}

export function kindForMime(mime: string): MediaKind | null {
  if ((IMAGE_MIME as readonly string[]).includes(mime)) return "image";
  if ((VIDEO_MIME as readonly string[]).includes(mime)) return "video";
  return null;
}

export type UploadCheck = { ok: true; kind: MediaKind } | { ok: false; reason: string };

/** Yükleme başlamadan önceki beyan kontrolü (dosya içeriği ayrıca sunucuda doğrulanır). */
export function checkUploadRequest(
  input: { mimeType: string; bytes: number; durationSeconds?: number | null },
  usage: { usedBytes: number; quotaBytes: number },
  limits: MediaLimits,
): UploadCheck {
  const kind = kindForMime(input.mimeType);
  if (!kind) return { ok: false, reason: "Desteklenmeyen dosya türü. Görsel: JPEG, PNG, WebP · Video: MP4, WebM" };
  if (!Number.isInteger(input.bytes) || input.bytes <= 0) return { ok: false, reason: "Geçersiz dosya boyutu" };
  const max = kind === "image" ? limits.maxImageBytes : limits.maxVideoBytes;
  if (input.bytes > max) return { ok: false, reason: `Dosya çok büyük (en fazla ${Math.round(max / 1024 / 1024)} MB)` };
  if (kind === "video" && input.durationSeconds != null && input.durationSeconds > limits.maxVideoSeconds) {
    return { ok: false, reason: `Video en fazla ${Math.round(limits.maxVideoSeconds / 60)} dakika olabilir` };
  }
  if (usage.usedBytes + input.bytes > usage.quotaBytes) {
    return { ok: false, reason: `Depolama kotası aşılıyor (${formatBytes(usage.usedBytes)} / ${formatBytes(usage.quotaBytes)} kullanılıyor)` };
  }
  return { ok: true, kind };
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2).replace(".", ",")} GB`;
}

/** Kamuya teslim edilebilir mi? (hazır + hak doğrulanmış + onaylı + herkese açık kopya mevcut) */
export function isPubliclyDeliverable(m: Pick<ProfileMedia, "status" | "rightsConfirmed" | "moderation" | "publicUrl">): boolean {
  return m.status === "ready" && m.rightsConfirmed && m.moderation === "approved" && Boolean(m.publicUrl);
}

/** Onaylanabilir mi? Onay, hak kaydı ve başarılı işleme gerektirir. */
export function approvalBlocker(m: Pick<ProfileMedia, "status" | "rightsConfirmed" | "ownershipSource">): string | null {
  if (m.status !== "ready") return "Medya işlenmeden onaylanamaz";
  if (!m.rightsConfirmed || !m.ownershipSource) return "Önce sahiplik / kullanım hakkı kaydedilmeli";
  return null;
}

/** Kamuya sıralama: kapak önce, sonra konum. */
export function orderMedia<T extends Pick<ProfileMedia, "isCover" | "position">>(items: T[]): T[] {
  return items.slice().sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.position - b.position);
}

/** İki dHash (16 haneli hex, 64 bit) arasındaki Hamming uzaklığı. */
export function hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 4) {
    let x = Number.parseInt(a.slice(i, i + 4), 16) ^ Number.parseInt(b.slice(i, i + 4), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Algısal olarak neredeyse aynı görsel eşiği (64 bit üzerinden). */
export const NEAR_DUPLICATE_THRESHOLD = 6;
