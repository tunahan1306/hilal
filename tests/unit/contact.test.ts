import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactMessageSchema } from "@/domain/schemas";
import type { Admin } from "@/domain/types";
import { publicContactEmail } from "@/lib/site";
import { redact } from "@/server/log";
import { resetRateLimits, sharedRateLimit } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { resetDemoStore } from "@/server/repositories/memory";
import { DomainError, RateLimitedError } from "@/server/services/errors";
import {
  CONTACT_MESSAGES_PER_HOUR, CONTACT_MIN_FILL_MS, ContactUnavailableError, SpamRejectedError, contactNotificationConfig, contactRetention,
  deleteContactMessage, markContactMessageUnread, openContactMessage, purgeExpiredContactMessages, submitContactMessage, updateContactMessageStatus,
} from "@/server/services/contact";

const NOW = Date.parse("2026-10-18T10:00:00Z");
const valid = (over: Record<string, unknown> = {}) => ({
  category: "support",
  name: "Test Kişi",
  email: "test@example.test",
  subject: "Giriş sorunu",
  message: "Sentetik test mesajı: sayfa yüklenirken bir sorun yaşıyorum.",
  acknowledge: true,
  website: "",
  startedAt: NOW - 10_000,
  ...over,
});

let admin: Admin;
beforeEach(async () => {
  resetDemoStore();
  resetRateLimits();
  admin = (await getRepository().getAdmin("admin-0001"))!;
});

describe("iletişim şeması", () => {
  it("geçerli girdiyi kırparak kabul eder", () => {
    const parsed = contactMessageSchema.parse(valid({ name: "  Test Kişi  " }));
    expect(parsed.name).toBe("Test Kişi");
  });
  it.each([
    ["HTML içeren mesaj", { message: "<script>alert(1)</script> uzun bir mesaj metni" }],
    ["geçersiz e-posta", { email: "olmaz" }],
    ["kısa mesaj", { message: "kısa" }],
    ["çok uzun mesaj", { message: "a".repeat(3001) }],
    ["bilinmeyen kategori", { category: "hack" }],
    ["onaysız", { acknowledge: false }],
  ])("%s reddedilir", (_l, over) => {
    expect(contactMessageSchema.safeParse(valid(over)).success).toBe(false);
  });
});

describe("iletişim mesajı gönderimi", () => {
  it("kaydeder, okunmamış başlar ve denetim kaydı yazar", async () => {
    const m = await submitContactMessage(valid(), "fp-contact-1", NOW);
    expect(m.status).toBe("new");
    expect(m.readAt).toBeNull();
    expect(m.ipHash).toBe("fp-contact-1");
    expect(await getRepository().countUnreadContactMessages()).toBe(1);
    const logs = await getRepository().listAuditLogs({ limit: 5, entityId: m.id });
    expect(logs.map((l) => l.action)).toContain("contact_message.create");
    // Denetim kaydı kişisel veri içermez
    expect(JSON.stringify(logs)).not.toContain("test@example.test");
  });

  it("honeypot dolu ise reddeder", async () => {
    await expect(submitContactMessage(valid({ website: "spam" }), "fp-hp", NOW)).rejects.toThrow();
    expect((await getRepository().listContactMessages()).length).toBe(0);
  });

  it("çok hızlı doldurulan formu bot sayar", async () => {
    await expect(submitContactMessage(valid({ startedAt: NOW - CONTACT_MIN_FILL_MS + 100 }), "fp-fast", NOW)).rejects.toBeInstanceOf(SpamRejectedError);
  });

  it("aynı mesajın tekrar gönderimini engeller", async () => {
    await submitContactMessage(valid(), "fp-dup", NOW);
    await expect(submitContactMessage(valid(), "fp-dup", NOW + 1000)).rejects.toThrow(/az önce alındı/);
    expect((await getRepository().listContactMessages()).length).toBe(1);
  });

  it("süreç içi oran sınırı uygular", async () => {
    for (let i = 0; i < 3; i++) await submitContactMessage(valid({ subject: `Konu ${i} test` }), "fp-rl", NOW + i);
    await expect(submitContactMessage(valid({ subject: "Konu 4 test" }), "fp-rl", NOW + 10)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("veritabanı tabanlı saatlik sınır uygular (instance'lar arası)", async () => {
    for (let i = 0; i < CONTACT_MESSAGES_PER_HOUR; i++) {
      resetRateLimits(); // farklı sunucusuz instance'ları taklit eder
      await submitContactMessage(valid({ subject: `Konu ${i} test`, startedAt: Date.now() - 10_000 }), "fp-db");
    }
    resetRateLimits();
    await expect(submitContactMessage(valid({ subject: "Bir konu daha", startedAt: Date.now() - 10_000 }), "fp-db")).rejects.toBeInstanceOf(RateLimitedError);
  });
});

describe("yönetim işlemleri", () => {
  it("açınca okundu yapar, durum değişimini ve geçmişi kaydeder", async () => {
    const m = await submitContactMessage(valid(), "fp-admin", NOW);
    const opened = await openContactMessage(admin, m.id);
    expect(opened?.readAt).not.toBeNull();
    // ikinci açılış yeni kayıt üretmez
    await openContactMessage(admin, m.id);
    await updateContactMessageStatus(admin, m.id, "answered");
    await markContactMessageUnread(admin, m.id);
    const after = await getRepository().getContactMessage(m.id);
    expect(after?.status).toBe("answered");
    expect(after?.readAt).toBeNull();
    const actions = (await getRepository().listAuditLogs({ limit: 10, entityId: m.id })).map((l) => l.action);
    expect(actions.filter((a) => a === "contact_message.read")).toHaveLength(1);
    expect(actions).toEqual(expect.arrayContaining(["contact_message.status", "contact_message.unread"]));
  });

  it("spam mesajlar okunmamış sayacına girmez", async () => {
    const m = await submitContactMessage(valid(), "fp-spam", NOW);
    await updateContactMessageStatus(admin, m.id, "spam");
    await markContactMessageUnread(admin, m.id);
    expect(await getRepository().countUnreadContactMessages()).toBe(0);
  });

  it("olmayan mesaj için hata verir", async () => {
    await expect(updateContactMessageStatus(admin, "yok", "closed")).rejects.toBeInstanceOf(DomainError);
  });
});

describe("yapılandırma", () => {
  it("e-posta bildirimi yalnızca tüm değişkenler varsa etkin", () => {
    expect(contactNotificationConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(contactNotificationConfig({ RESEND_API_KEY: "k", CONTACT_NOTIFY_TO: "a@b.co" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(contactNotificationConfig({ RESEND_API_KEY: "k", CONTACT_NOTIFY_TO: "a@b.co", CONTACT_NOTIFY_FROM: "c@d.co" } as unknown as NodeJS.ProcessEnv)).not.toBeNull();
  });
  it("yapılandırma yoksa dışarıya istek atmaz", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    await submitContactMessage(valid(), "fp-nofetch", NOW);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("yer tutucu iletişim e-postasını göstermez", () => {
    expect(publicContactEmail({} as NodeJS.ProcessEnv)).toBeNull();
    expect(publicContactEmail({ CONTACT_PUBLIC_EMAIL: "destek@example.com" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(publicContactEmail({ CONTACT_PUBLIC_EMAIL: "destek@hilal.app" } as unknown as NodeJS.ProcessEnv)).toBe("destek@hilal.app");
  });
});

describe("hata yönetimi ve loglar", () => {
  it("veritabanı hatasında teknik ayrıntı göstermez ve kişisel veriyi loglamaz", async () => {
    const repo = getRepository();
    const spyCreate = vi.spyOn(repo, "createContactMessage").mockRejectedValueOnce(
      Object.assign(new Error('relation "contact_messages" does not exist; Failing row contains (test@example.test)'), { code: "42P01" }),
    );
    const spyLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = await submitContactMessage(valid(), "fp-db-missing", NOW).catch((e) => e);
    expect(err).toBeInstanceOf(ContactUnavailableError);
    expect(err.message).not.toMatch(/relation|contact_messages|42P01/);
    const logged = spyLog.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("contact.create");
    expect(logged).not.toContain("test@example.test");
    expect(logged).not.toContain("Sentetik test mesajı");
    spyCreate.mockRestore();
    spyLog.mockRestore();
  });

  it("redact e-posta ve telefon numarasını maskeler", () => {
    expect(redact("hata: a.b@ornek.com 0532 123 45 67")).toBe("hata: [e-posta] [numara]");
  });
});

describe("saklama ve silme", () => {
  it("varsayılan süreler ve '0' ile kapatma", () => {
    expect(contactRetention({} as NodeJS.ProcessEnv)).toEqual({ handledDays: 365, spamDays: 30 });
    expect(contactRetention({ CONTACT_RETENTION_DAYS: "0", CONTACT_SPAM_RETENTION_DAYS: "7" } as unknown as NodeJS.ProcessEnv)).toEqual({ handledDays: 0, spamDays: 7 });
  });

  it("yalnızca süresi dolan yanıtlanmış/kapatılmış/spam mesajları siler", async () => {
    const a = await submitContactMessage(valid({ subject: "Eski yanıtlanmış" }), "fp-r1", NOW);
    const b = await submitContactMessage(valid({ subject: "Eski spam konusu" }), "fp-r2", NOW);
    const c = await submitContactMessage(valid({ subject: "Yeni bekleyen" }), "fp-r3", NOW);
    await updateContactMessageStatus(admin, a.id, "answered");
    await updateContactMessageStatus(admin, b.id, "spam");
    const later = Date.now() + 400 * 86_400_000;
    expect(await purgeExpiredContactMessages(later, {} as NodeJS.ProcessEnv)).toEqual({ handled: 1, spam: 1 });
    const left = (await getRepository().listContactMessages()).map((m) => m.id);
    expect(left).toEqual([c.id]);
  });

  it("kalıcı silme gerekçe ister ve denetimde kişisel veri tutmaz", async () => {
    const m = await submitContactMessage(valid(), "fp-del", NOW);
    await expect(deleteContactMessage(admin, m.id, "")).rejects.toBeInstanceOf(DomainError);
    await deleteContactMessage(admin, m.id, "KVKK silme talebi");
    expect(await getRepository().getContactMessage(m.id)).toBeNull();
    const logs = await getRepository().listAuditLogs({ limit: 10, entityId: m.id });
    expect(logs.map((l) => l.action)).toContain("contact_message.delete");
    expect(JSON.stringify(logs)).not.toContain("test@example.test");
  });
});

describe("paylaşılan oran sınırı", () => {
  it("bellek deposunda süreç içi sayaca düşer", async () => {
    expect((await sharedRateLimit("t:k", 2, 60_000)).ok).toBe(true);
    expect((await sharedRateLimit("t:k", 2, 60_000)).ok).toBe(true);
    expect((await sharedRateLimit("t:k", 2, 60_000)).ok).toBe(false);
  });
  it("veritabanı fonksiyonu varsa onu kullanır, hata verirse yerel sayaca düşer", async () => {
    const repo = getRepository() as { hitRateLimit?: unknown };
    const spyLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    repo.hitRateLimit = vi.fn().mockResolvedValueOnce({ ok: false, retryAfterSeconds: 9 }).mockRejectedValueOnce(new Error("function missing"));
    expect(await sharedRateLimit("t:db", 5, 60_000)).toEqual({ ok: false, retryAfterMs: 9000 });
    expect((await sharedRateLimit("t:db", 5, 60_000)).ok).toBe(true);
    delete repo.hitRateLimit;
    spyLog.mockRestore();
  });
});
