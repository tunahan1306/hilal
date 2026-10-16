import "server-only";
import sharp from "sharp";
import { DomainError } from "./errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

type Detected = "image/jpeg" | "image/png" | "image/webp";

/** MIME türünü istemcinin beyanına değil, dosyanın ilk baytlarına göre belirler. */
export function sniffImageType(buf: Buffer): Detected | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export type ProcessedImage = { data: Buffer; width: number; height: number; contentType: "image/webp" };

/**
 * Yüklenen görseli doğrular ve yeniden kodlar:
 * - Yalnızca JPEG/PNG/WebP (magic byte kontrolü), en fazla 5 MB
 * - EXIF/GPS dahil tüm metadata silinir (sharp varsayılan olarak metadata yazmaz)
 * - En uzun kenar 1600 px, WebP formatı
 */
export async function processUpload(buf: Buffer): Promise<ProcessedImage> {
  if (buf.length === 0) throw new DomainError("Dosya boş");
  if (buf.length > MAX_UPLOAD_BYTES) throw new DomainError("Dosya 5 MB sınırını aşıyor");
  if (!sniffImageType(buf)) throw new DomainError("Yalnızca JPEG, PNG veya WebP yüklenebilir");
  try {
    const { data, info } = await sharp(buf, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, contentType: "image/webp" };
  } catch {
    throw new DomainError("Görsel işlenemedi; dosya bozuk olabilir");
  }
}

/** Rıza / doğrulama belgeleri: PDF veya görsel, 10 MB. */
export function validateDocument(buf: Buffer): "application/pdf" | Detected {
  if (buf.length === 0 || buf.length > 10 * 1024 * 1024) throw new DomainError("Belge 10 MB sınırını aşıyor veya boş");
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const img = sniffImageType(buf);
  if (img) return img;
  throw new DomainError("Belge PDF, JPEG, PNG veya WebP olmalı");
}
