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

let sharedUnavailableLogged = false;

/**
 * Paylaşılan oran sınırı. Supabase varsa veritabanındaki atomik sayaç kullanılır
 * (tüm sunucusuz instance'lar için tek sayaç); yoksa (demo/test) süreç içi sayaç.
 * Veritabanı fonksiyonu yoksa (migration uygulanmamış) süreç içi sayaca düşülür ve
 * bu durum bir kez loglanır — istek engellenmez ama koruma zayıflar.
 */
export async function sharedRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<{ ok: boolean; retryAfterMs: number }> {
  const { getRepository } = await import("./repositories");
  const repo = getRepository();
  if (repo.hitRateLimit) {
    try {
      const r = await repo.hitRateLimit(hashKey(key), limit, Math.max(1, Math.ceil(windowMs / 1000)));
      return { ok: r.ok, retryAfterMs: r.retryAfterSeconds * 1000 };
    } catch (e) {
      if (!sharedUnavailableLogged) {
        sharedUnavailableLogged = true;
        const { logError } = await import("./log");
        logError("rate-limit.shared-unavailable", e);
      }
    }
  }
  return rateLimit(key, limit, windowMs, now);
}

export async function clearSharedRateLimit(key: string): Promise<void> {
  clearRateLimit(key);
  const { getRepository } = await import("./repositories");
  await getRepository().clearSharedRateLimit?.(hashKey(key)).catch(() => undefined);
}

/** Veritabanındaki anahtar: kapsam öneki + özet (e-posta gibi ham değerler saklanmaz). */
function hashKey(key: string): string {
  const i = key.indexOf(":");
  const scope = i > 0 ? key.slice(0, i) : "k";
  return `${scope}:${createHash("sha256").update(key).digest("hex").slice(0, 40)}`;
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}

export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * İstemci IP'sini güvenilir kaynaktan çözümler.
 * - `CLIENT_IP_HEADER` tanımlıysa (ör. `cf-connecting-ip`) yalnızca o başlık kullanılır.
 * - Vercel'de platform `x-real-ip` / `x-forwarded-for` başlıklarını kendisi yazar.
 * - Kendi sunucunuzda: başlığı ekleyen/ezen bir ters vekil (nginx vb.) arkasında
 *   çalışılmalıdır; zincirdeki SON değer (vekilin gördüğü adres) kullanılır.
 *   İstemcinin gönderdiği ilk değer asla tek başına güvenilmez.
 */
export function resolveClientIp(get: (name: string) => string | null, env: NodeJS.ProcessEnv = process.env): string {
  const first = (v: string | null | undefined) => v?.split(",")[0]?.trim() || undefined;
  if (env.CLIENT_IP_HEADER) return first(get(env.CLIENT_IP_HEADER.toLowerCase())) ?? "unknown";
  if (env.VERCEL) return first(get("x-real-ip")) ?? first(get("x-forwarded-for")) ?? "unknown";
  return get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

/** İstemci IP'sinin tuzlu özeti — ham IP hiçbir yerde saklanmaz. */
export async function clientFingerprint(): Promise<string> {
  const h = await headers();
  const ip = resolveClientIp((n) => h.get(n));
  const salt = requiredSecret("IP_HASH_SALT", "dev-only-ip-hash-salt-change-me-0000000");
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
