import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { logError } from "@/server/log";
import { getRepository } from "@/server/repositories";
import { purgeExpiredContactMessages } from "@/server/services/contact";
import { reconcilePublicMedia } from "@/server/services/media";
import { purgeExpiredVerificationDocuments } from "@/server/services/profiles";
import { syncSubscriptionStatuses } from "@/server/services/subscriptions";

/**
 * Günlük bakım: süresi dolan doğrulama belgelerini ve iletişim mesajlarını siler,
 * abonelik durumlarını günceller, herkese açık medyayı yayın durumuyla eşitler ve
 * eski oran sınırı kayıtlarını temizler. Her adım bağımsızdır; biri başarısız olsa da
 * diğerleri çalışır. Vercel Cron `Authorization: Bearer $CRON_SECRET` gönderir.
 */
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | { error: true }> {
  try { return await fn(); } catch (e) { logError(`cron.${name}`, e); return { error: true }; }
}

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [purged, subscriptions, contact, media, rateLimits] = await Promise.all([
    step("verification", purgeExpiredVerificationDocuments),
    step("subscriptions", syncSubscriptionStatuses),
    step("contact", () => purgeExpiredContactMessages()),
    step("media", reconcilePublicMedia),
    step("rate-limits", async () => (await getRepository().purgeRateLimits?.()) ?? 0),
  ]);
  const results = { purged, subscriptions, contact, media, rateLimits };
  const ok = !Object.values(results).some((r) => typeof r === "object" && r !== null && "error" in r);
  return Response.json({ ok, ...results }, { status: ok ? 200 : 500 });
}
