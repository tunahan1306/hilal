/**
 * İletişim modülü, paylaşılan oran sınırı ve medya vekili için Supabase entegrasyon testleri.
 * Yalnızca yerel/izole Supabase (127.0.0.1) — production'a karşı çalıştırmayın. Veriler sentetiktir.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Admin } from "@/domain/types";
import { sharedRateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import {
  deleteContactMessage, openContactMessage, purgeExpiredContactMessages, submitContactMessage, updateContactMessageStatus,
} from "@/server/services/contact";
import { RateLimitedError } from "@/server/services/errors";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const local = Boolean(url && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url));
const enabled = local && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const service = enabled ? createClient(url!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) : null;
const anon = enabled ? createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } }) : null;

let admin: Admin;
const email = `it-contact-${Date.now()}@test.local`;
const fp = `itfp${Date.now()}`.padEnd(24, "0");
const valid = (subject: string) => ({
  category: "support", name: "Entegrasyon Kişi", email: "it-sender@test.local", subject,
  message: "Sentetik entegrasyon testi mesajı; gerçek bir talep değildir.", acknowledge: true, website: "", startedAt: Date.now() - 10_000,
});

describe.skipIf(!enabled)("İletişim ve güvenlik (Supabase entegrasyon)", () => {
  beforeAll(async () => {
    expect(getRepository().kind).toBe("supabase");
    const { data, error } = await service!.auth.admin.createUser({ email, password: "Integration-Test-1234!", email_confirm: true });
    if (error) throw error;
    const ins = await service!.from("admins").insert({ id: data.user.id, email, display_name: "IT", role: "owner" });
    if (ins.error) throw ins.error;
    admin = (await getRepository().getAdmin(data.user.id))!;
  });

  afterAll(async () => {
    await service!.from("contact_messages").delete().eq("ip_hash", fp);
    await service!.from("rate_limit_buckets").delete().like("key", "it%");
    if (admin) await service!.auth.admin.deleteUser(admin.id);
  });

  it("mesaj kaydedilir, okundu/durum/sil işlemleri ve denetim kaydı çalışır", async () => {
    const m = await submitContactMessage(valid(`IT ${Date.now()}`), fp);
    expect(m.status).toBe("new");
    const repo = getRepository();
    expect(await repo.countUnreadContactMessages()).toBeGreaterThan(0);
    const opened = await openContactMessage(admin, m.id);
    expect(opened?.readAt).not.toBeNull();
    await updateContactMessageStatus(admin, m.id, "answered");
    expect((await repo.getContactMessage(m.id))?.status).toBe("answered");
    const actions = (await repo.listAuditLogs({ limit: 20, entityId: m.id })).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["contact_message.create", "contact_message.read", "contact_message.status"]));
    const audit = JSON.stringify(await repo.listAuditLogs({ limit: 20, entityId: m.id }));
    expect(audit).not.toContain("it-sender@test.local");
    await deleteContactMessage(admin, m.id, "entegrasyon temizliği");
    expect(await repo.getContactMessage(m.id)).toBeNull();
  });

  it("veritabanı CHECK kısıtları servis rolüyle de HTML'i reddeder", async () => {
    const r = await service!.from("contact_messages").insert({ category: "general", name: "<b>x</b>", email: "a@test.local", subject: "Konu", message: "Bu yeterince uzun bir test mesajıdır.", ip_hash: fp });
    expect(r.error?.code).toBe("23514");
  });

  it("anon REST üzerinden mesaj okuyamaz/yazamaz, oran sınırı fonksiyonunu çağıramaz", async () => {
    const read = await anon!.from("contact_messages").select("id").limit(1);
    expect(read.error ?? read.data?.length === 0).toBeTruthy();
    if (!read.error) expect(read.data).toEqual([]);
    const write = await anon!.from("contact_messages").insert({ category: "general", name: "Anon", email: "a@test.local", subject: "Konu", message: "Anon doğrudan yazmaya çalışıyor.", ip_hash: fp });
    expect(write.error).not.toBeNull();
    const rpc = await anon!.rpc("rate_limit_hit", { p_key: "it:anon", p_limit: 1, p_window_seconds: 60 });
    expect(rpc.error).not.toBeNull();
    const buckets = await anon!.from("rate_limit_buckets").select("key").limit(1);
    expect(buckets.error ?? buckets.data?.length === 0).toBeTruthy();
  });

  it("paylaşılan oran sınırı veritabanında sayar (instance belleğinden bağımsız)", async () => {
    const key = `it-shared:${Date.now()}`;
    expect((await sharedRateLimit(key, 2, 60_000)).ok).toBe(true);
    expect((await sharedRateLimit(key, 2, 60_000)).ok).toBe(true);
    const third = await sharedRateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
    const { count } = await service!.from("rate_limit_buckets").select("key", { count: "exact", head: true }).like("key", "it-shared:%");
    expect(count).toBeGreaterThan(0);
    // anahtar özetlenmiş saklanır
    const { data } = await service!.from("rate_limit_buckets").select("key").like("key", "it-shared:%");
    expect(JSON.stringify(data)).not.toContain(String(key.split(":")[1]));
  });

  it("iletişim formu saatlik veritabanı sınırını uygular", async () => {
    let limited = false;
    for (let i = 0; i < 8 && !limited; i++) {
      try { await submitContactMessage(valid(`IT limit ${i} ${Date.now()}`), fp); } catch (e) { limited = e instanceof RateLimitedError; if (!limited) throw e; }
    }
    expect(limited).toBe(true);
  });

  it("saklama temizliği yalnızca süresi dolmuş işlenmiş mesajları siler", async () => {
    const r = await purgeExpiredContactMessages(Date.now(), { CONTACT_RETENTION_DAYS: "365", CONTACT_SPAM_RETENTION_DAYS: "30" } as unknown as NodeJS.ProcessEnv);
    expect(r).toEqual({ handled: 0, spam: 0 });
  });

  it("medya vekili yayında olmayan adresi reddeder; SEO ayarı silinebilir", async () => {
    const repo = getRepository();
    expect(await repo.isPublishedMediaUrl(`${url}/storage/v1/object/public/media-public/yok-${Date.now()}.webp`)).toBe(false);
    const page = await repo.upsertSeoPage({ path: `/sehir/it-${Date.now()}`.slice(0, 40), title: null, description: null, canonical: null, indexOverride: null, intro: null });
    await repo.deleteSeoPage(page.id);
    expect(await repo.getSeoPage(page.path)).toBeNull();
  });
});
