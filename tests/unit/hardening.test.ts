import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Admin } from "@/domain/types";
import { demoAdminConfig } from "@/server/auth/demo-credentials";
import { productionConfigErrors, requiredSecret } from "@/server/env";
import { resetRateLimits, resolveClientIp } from "@/server/rate-limit";
import { getRepository } from "@/server/repositories";
import { resetDemoStore } from "@/server/repositories/memory";
import { DomainError } from "@/server/services/errors";
import { MAX_DOCUMENT_BYTES, validateDocument } from "@/server/services/images";
import { AUTO_UNPUBLISH_PER_HOUR, REPORTS_PER_PROFILE_PER_HOUR, submitReport } from "@/server/services/moderation";
import { renewSubscription } from "@/server/services/subscriptions";

describe("production sır zorunluluğu", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("production'da varsayılan sır kullanılmaz", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => requiredSecret("SESSION_SECRET", "dev-fallback-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toThrow(/zorunludur/);
    vi.stubEnv("SESSION_SECRET", "kisa");
    expect(() => requiredSecret("SESSION_SECRET", "dev")).toThrow();
    vi.stubEnv("SESSION_SECRET", "x".repeat(32));
    expect(requiredSecret("SESSION_SECRET", "dev")).toBe("x".repeat(32));
  });

  it("geliştirmede varsayılan sır kullanılabilir", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_SECRET", "");
    expect(requiredSecret("SESSION_SECRET", "dev")).toBe("dev");
  });

  it("production demo modunda bilinen yönetici şifresi/TOTP sırrı reddedilir", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_ADMIN_PASSWORD", "");
    vi.stubEnv("DEMO_ADMIN_TOTP_SECRET", "");
    expect(() => demoAdminConfig()).toThrow(/zorunludur/);
  });

  it("açılış kontrolü eksik yapılandırmayı listeler", () => {
    expect(productionConfigErrors({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toEqual(
      expect.arrayContaining(["IP_HASH_SALT (≥32 karakter)", "Supabase değişkenleri veya ALLOW_DEMO_MODE=true"]),
    );
    expect(productionConfigErrors({ NODE_ENV: "production", ALLOW_DEMO_MODE: "true", IP_HASH_SALT: "s".repeat(32) } as unknown as NodeJS.ProcessEnv)).toHaveLength(3);
    expect(
      productionConfigErrors({
        NODE_ENV: "production", IP_HASH_SALT: "s".repeat(32),
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "b",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual([]);
  });
});

describe("istemci IP çözümleme", () => {
  const headers = (h: Record<string, string>) => (n: string) => h[n] ?? null;
  it("kendi sunucusunda istemcinin eklediği ilk değere güvenmez (son vekil değeri)", () => {
    expect(resolveClientIp(headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.9" }), {} as unknown as NodeJS.ProcessEnv)).toBe("10.0.0.9");
  });
  it("Vercel'de platform başlığını kullanır", () => {
    expect(resolveClientIp(headers({ "x-real-ip": "5.6.7.8", "x-forwarded-for": "9.9.9.9" }), { VERCEL: "1" } as unknown as NodeJS.ProcessEnv)).toBe("5.6.7.8");
  });
  it("yapılandırılmış başlığı tercih eder", () => {
    expect(resolveClientIp(headers({ "cf-connecting-ip": "7.7.7.7", "x-forwarded-for": "1.1.1.1" }), { CLIENT_IP_HEADER: "CF-Connecting-IP" } as unknown as NodeJS.ProcessEnv)).toBe("7.7.7.7");
  });
});

describe("IP'den bağımsız kötüye kullanım sınırları", () => {
  let admin: Admin;
  beforeEach(async () => {
    resetDemoStore();
    resetRateLimits();
    admin = (await getRepository().getAdmin("admin-0001"))!;
  });

  it("aynı profile saatte en fazla N şikâyet kabul edilir (IP değişse bile)", async () => {
    for (let i = 0; i < REPORTS_PER_PROFILE_PER_HOUR; i++) {
      await submitReport({ profileId: "prf-0001", category: "other", description: `Deneme şikâyeti ${i}` }, `ip-${i}`);
    }
    await expect(submitReport({ profileId: "prf-0001", category: "other", description: "Bir tane daha" }, "ip-yeni")).rejects.toThrow(/çok sayıda bildirim/);
  });

  it("toplu kritik şikâyette devre kesici otomatik kaldırmayı durdurur", async () => {
    const published = (await getRepository().listProfiles()).filter((p) => p.status === "published");
    const results = [];
    for (let i = 0; i < AUTO_UNPUBLISH_PER_HOUR + 2; i++) {
      results.push((await submitReport({ profileId: published[i].id, category: "suspected_minor", description: "Toplu saldırı denemesi" }, `bot-${i}`)).autoUnpublished);
    }
    expect(results.filter(Boolean)).toHaveLength(AUTO_UNPUBLISH_PER_HOUR);
    expect(results.slice(-2)).toEqual([false, false]);
    expect((await getRepository().getProfile(published[AUTO_UNPUBLISH_PER_HOUR].id))!.status).toBe("published");
    const logs = await getRepository().listAuditLogs({ limit: 100 });
    expect(logs.filter((l) => l.action === "report.auto_unpublish_suppressed")).toHaveLength(2);
    expect(admin).toBeTruthy();
  });

  it("geçersiz yenileme süresi anlaşılır alan hatası verir", async () => {
    const sub = (await getRepository().listSubscriptions())[0];
    for (const m of [Number.NaN, 0, 25, 1.5]) await expect(renewSubscription(admin, sub.id, m)).rejects.toBeInstanceOf(DomainError);
  });

  it("belge sınırı Server Action gövde sınırının altındadır", () => {
    expect(MAX_DOCUMENT_BYTES).toBeLessThan(6 * 1024 * 1024);
    expect(() => validateDocument(Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(MAX_DOCUMENT_BYTES)]))).toThrow(/5 MB/);
  });
});
