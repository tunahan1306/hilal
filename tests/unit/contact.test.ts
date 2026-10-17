import { beforeEach, describe, expect, it, vi } from "vitest";
import { contactMessageSchema } from "@/domain/schemas";
import type { Admin } from "@/domain/types";
import { publicContactEmail } from "@/lib/site";
import { resetRateLimits } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { resetDemoStore } from "@/server/repositories/memory";
import { DomainError, RateLimitedError } from "@/server/services/errors";
import {
  CONTACT_MESSAGES_PER_HOUR, CONTACT_MIN_FILL_MS, SpamRejectedError, contactNotificationConfig, markContactMessageUnread,
  openContactMessage, submitContactMessage, updateContactMessageStatus,
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
