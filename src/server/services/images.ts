import "server-only";
import { createHash } from "node:crypto";
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
export type ProcessedImageSet = { full: ProcessedImage; thumb: ProcessedImage; sha256: string; dhash: string };

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

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** Rıza / doğrulama belgeleri: PDF veya görsel, 5 MB (Server Action gövde sınırı 6 MB). */
export function validateDocument(buf: Buffer): "application/pdf" | Detected {
  if (buf.length === 0 || buf.length > MAX_DOCUMENT_BYTES) throw new DomainError("Belge 5 MB sınırını aşıyor veya boş");
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  const img = sniffImageType(buf);
  if (img) return img;
  throw new DomainError("Belge PDF, JPEG, PNG veya WebP olmalı");
}

const FULL_MAX = 2400;
const THUMB_MAX = 480;

/**
 * Galeri görseli işleme: tam boy (≤2400px) + küçük önizleme (≤480px), ikisi de
 * metadata'sız WebP. Aynı dosya tespiti için SHA-256, benzer görsel tespiti
 * için 64 bit dHash üretir.
 */
export async function processGalleryImage(buf: Buffer, maxBytes: number): Promise<ProcessedImageSet> {
  if (buf.length === 0) throw new DomainError("Dosya boş");
  if (buf.length > maxBytes) throw new DomainError(`Dosya ${Math.round(maxBytes / 1024 / 1024)} MB sınırını aşıyor`);
  if (!sniffImageType(buf)) throw new DomainError("Yalnızca JPEG, PNG veya WebP yüklenebilir");
  try {
    const base = sharp(buf, { limitInputPixels: 80_000_000, failOn: "error" }).rotate();
    const [full, thumb, dhash] = await Promise.all([
      base.clone().resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true }),
      base.clone().resize({ width: THUMB_MAX, height: THUMB_MAX, fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer({ resolveWithObject: true }),
      computeDHash(buf),
    ]);
    return {
      full: { data: full.data, width: full.info.width, height: full.info.height, contentType: "image/webp" },
      thumb: { data: thumb.data, width: thumb.info.width, height: thumb.info.height, contentType: "image/webp" },
      sha256: createHash("sha256").update(buf).digest("hex"),
      dhash,
    };
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw new DomainError("Görsel işlenemedi; dosya bozuk olabilir");
  }
}

/** 64 bit fark özeti (dHash): 9x8 gri ölçek, her satırda komşu piksel karşılaştırması. */
export async function computeDHash(buf: Buffer): Promise<string> {
  const { data } = await sharp(buf).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] < data[y * 9 + x + 1] ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += Number.parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}
