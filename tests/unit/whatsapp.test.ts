import { beforeEach, describe, expect, it } from "vitest";
import { normalizeWhatsAppPhone, whatsAppHref } from "@/domain/whatsapp";
import { profileInputSchema } from "@/domain/schemas";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { updateProfile } from "@/server/services/profiles";
import { getRepository } from "@/server/repositories";
beforeEach(resetDemoStore);
describe("izinli WhatsApp iletişimi", () => {
  it("Türkiye cep telefonunu normalize eder, keyfi URL ve geçersiz numarayı reddeder", () => {
    for (const phone of ["0532 000 00 00", "+90 (532) 000-00-00", "5320000000", "905320000000"]) {
      expect(normalizeWhatsAppPhone(phone)).toBe("905320000000");
      expect(whatsAppHref(phone)).toBe("https://wa.me/905320000000");
    }
    for (const phone of ["javascript:alert(1)", "https://example.com", "02120000000", "0532", "", "+44 7700 900000"]) expect(whatsAppHref(phone)).toBeNull();
  });
  it("kamu projeksiyonu numarayı yalnızca izin varsa döndürür", async () => {
    const repo = createMemoryRepository();
    const p = (await repo.listProfiles()).find((p) => p.status === "published")!;
    await repo.updateProfile(p.id, { whatsappPhone: "905320000000", whatsappConsentAt: null });
    expect((await repo.getPublicProfile(p.slug))!.whatsappPhone).toBeNull();
    await repo.updateProfile(p.id, { whatsappConsentAt: new Date().toISOString() });
    expect((await repo.getPublicProfile(p.slug))!.whatsappPhone).toBe("905320000000");
  });
  it("izin geri alındığında yayın durur ve numara izni temizlenir", async () => {
    const repo = getRepository();
    const admin = (await repo.getAdmin("admin-0001"))!;
    const p = (await repo.listProfiles()).find((p) => p.status === "published")!;
    await repo.updateProfile(p.id, { whatsappPhone: "905320000000", whatsappConsentAt: new Date().toISOString() });
    const input = profileInputSchema.parse({ ...p, seoTitle: p.seoTitle ?? undefined, seoDescription: p.seoDescription ?? undefined, whatsappPhone: "05320000000", whatsappConsent: false });
    const result = await updateProfile(admin, p.id, input);
    expect(result.requeued).toBe(true);
    expect(result.profile.whatsappConsentAt).toBeNull();
    expect(await repo.getPublicProfile(p.slug)).toBeNull();
  });
  it("numarasız izin kaydı reddedilir", () => {
    expect(profileInputSchema.safeParse({ nickname: "Test", birthDate: "1990-01-01", provincePlate: 34, bio: "Yetişkin sosyal profil için yeterli uzunlukta metin.", whatsappPhone: "", whatsappConsent: true }).success).toBe(false);
  });
});
