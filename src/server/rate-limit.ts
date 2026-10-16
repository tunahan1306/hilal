import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { requiredSecret } from "./env";

/**
 * Basit sabit pencereli oran sınırlayıcı (süreç içi bellek).
 *
 * Not: Sunucusuz ortamda her instance kendi sayacını tutar; bu nedenle bu katman
 * ilk savunma hattıdır. Production'da Vercel WAF rate limiting kuralları veya
 * paylaşımlı bir depo (Upstash Redis vb.) ile desteklenmelidir. Şikâyet gönderimi
 * ayrıca veritabanı tabanlı sayaçla da sınırlandırılır.
 */
type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __hilalRateLimit?: Map<string, Bucket> };
const buckets = (g.__hilalRateLimit ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterMs: number } {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterMs: 0 };
  }
  b.count += 1;
  return b.count > limit ? { ok: false, retryAfterMs: b.resetAt - now } : { ok: true, retryAfterMs: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

/** İstemci IP'sinin tuzlu özeti — ham IP hiçbir yerde saklanmaz. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = requiredSecret("IP_HASH_SALT", "dev-only-ip-hash-salt-change-me-0000000");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
