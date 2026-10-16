import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { purgeExpiredVerificationDocuments } from "@/server/services/profiles";
import { syncSubscriptionStatuses } from "@/server/services/subscriptions";

/**
 * Günlük bakım: süresi dolan doğrulama belgelerini siler, abonelik
 * durumlarını günceller. Vercel Cron `Authorization: Bearer $CRON_SECRET` gönderir.
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [purged, subscriptions] = await Promise.all([purgeExpiredVerificationDocuments(), syncSubscriptionStatuses()]);
  return Response.json({ ok: true, purged, subscriptions });
}
