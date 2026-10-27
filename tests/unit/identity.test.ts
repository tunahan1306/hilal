import { beforeEach, describe, expect, it } from "vitest";
import { hasActiveConsent, isAgeVerified, type AgeVerificationCheck, type ConsentRecord } from "@/domain/identity";
import { AgeVerificationDisabledError } from "@/server/auth/age-verification";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { createAppUserRecord, submitAgeVerification } from "@/server/services/identity";

beforeEach(resetDemoStore);

describe("kimlik kuralları (saf)", () => {
  const consent = (over: Partial<ConsentRecord>): ConsentRecord => ({
    id: "c1",
    userId: "u1",
    type: "tos",
    grantedAt: new Date().toISOString(),
    revokedAt: null,
    method: "web_form",
    evidenceRef: null,
    createdAt: new Date().toISOString(),
    ...over,
  });
  it("geri çekilmiş rıza aktif sayılmaz", () => {
    expect(hasActiveConsent([consent({})], "tos")).toBe(true);
    expect(hasActiveConsent([consent({ revokedAt: new Date().toISOString() })], "tos")).toBe(false);
    expect(hasActiveConsent([], "tos")).toBe(false);
  });

  const check = (over: Partial<AgeVerificationCheck>): AgeVerificationCheck => ({
    id: "a1",
    userId: "u1",
    provider: "test",
    providerRef: "ref",
    status: "approved",
    checkedAt: new Date().toISOString(),
    expiresAt: null,
    note: null,
    createdAt: new Date().toISOString(),
    ...over,
  });
  it("onaylı ve süresi geçmemiş en son kontrol geçerli sayılır", () => {
    expect(isAgeVerified([])).toBe(false);
    expect(isAgeVerified([check({ status: "pending" })])).toBe(false);
    expect(isAgeVerified([check({ status: "rejected" })])).toBe(false);
    expect(isAgeVerified([check({ status: "approved" })])).toBe(true);
    expect(isAgeVerified([check({ status: "approved", expiresAt: new Date(Date.now() - 86_400_000).toISOString() })])).toBe(false);
    // En son kayıt (createdAt) kazanır: reddedilen daha yeni olduğunda doğrulanmamış sayılır.
    const older = check({ status: "approved", createdAt: new Date(Date.now() - 1000).toISOString() });
    const newer = check({ status: "rejected", createdAt: new Date().toISOString() });
    expect(isAgeVerified([older, newer])).toBe(false);
  });
});

describe("kayıt (bellek deposu + servis)", () => {
  it("aynı e-posta ile ikinci hesap açılamaz; kayıt ToS+gizlilik rızasını otomatik oluşturur", async () => {
    const user = await createAppUserRecord({ id: "u1", email: "test@example.com" });
    expect(user.status).toBe("active");
    expect(user.emailVerifiedAt).toBeNull();
    await expect(createAppUserRecord({ id: "u2", email: "test@example.com" })).rejects.toThrow(/zaten bir hesap/);
    // Büyük/küçük harf duyarsız tekillik.
    await expect(createAppUserRecord({ id: "u3", email: "TEST@example.com" })).rejects.toThrow(/zaten bir hesap/);

    const repo = createMemoryRepository();
    const consents = await repo.listConsentRecords(user.id);
    expect(consents.map((c) => c.type).sort()).toEqual(["privacy_policy", "tos"]);
  });

  it("yaş doğrulama sağlayıcısı seçilmediği için her zaman devre dışı hatası döner", async () => {
    const user = await createAppUserRecord({ id: "u1", email: "test@example.com" });
    await expect(submitAgeVerification(user, { providerSessionRef: "session-1" })).rejects.toThrow(AgeVerificationDisabledError);
    // Devre dışı hatası hiçbir sonuç kaydı oluşturmamalı (uydurma onay yok).
    expect(await createMemoryRepository().listAgeVerificationChecks(user.id)).toEqual([]);
  });
});
