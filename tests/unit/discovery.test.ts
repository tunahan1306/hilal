import { beforeEach, describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "@/domain/discovery-cursor";
import { safeReturnPath } from "@/domain/age-confirmation";
import { createMemoryRepository, resetDemoStore } from "@/server/repositories/memory";
import { parseFilters } from "@/domain/filters";
beforeEach(resetDemoStore);
describe("keyset discovery", () => {
  it("visits every result once with bounded batches and equal timestamps", async () => {
    const repo = createMemoryRepository();
    const profiles = (await repo.listProfiles()).filter((p) => p.status === "published");
    for (const p of profiles) await repo.updateProfile(p.id, { publishedAt: "2026-10-01T12:00:00.000Z" });
    const seen: string[] = [];
    let cursor: { id: string; publishedAt: string } | undefined;
    for (let n = 0; n < 100; n++) {
      const batch = await repo.searchPublicProfiles(parseFilters({}), { limit: 3, offset: 0, cursor });
      if (!batch.items.length) break;
      expect(batch.items.length).toBeLessThanOrEqual(3);
      seen.push(...batch.items.map((p) => p.id));
      const last = batch.items.at(-1)!;
      cursor = decodeCursor(encodeCursor({ id: last.id, publishedAt: last.publishedAt }))!;
    }
    const total = (await repo.searchPublicProfiles(parseFilters({}), { limit: 1, offset: 0 })).total;
    expect(seen.length).toBe(total);
    expect(new Set(seen).size).toBe(total);
  });
  it("keeps district pages strictly scoped", async () => {
    const batch = await createMemoryRepository().searchPublicProfiles(parseFilters({ il: "istanbul", ilce: "kadikoy" }), { limit: 13, offset: 0 });
    expect(batch.items.length).toBeGreaterThan(0);
    expect(batch.items.every((p) => p.province.slug === "istanbul" && p.district?.slug === "kadikoy")).toBe(true);
  });
  it("rejects malformed cursors and unsafe return destinations", () => {
    for (const raw of ["bad", "x".repeat(600), encodeCursor({ id: "bad,query", publishedAt: "bad" })]) expect(decodeCursor(raw)).toBeNull();
    for (const raw of ["//evil.test", "/\\evil.test", "/admin", "https://evil.test", "/xx/kesfet"]) expect(safeReturnPath(raw)).toBe("/tr");
    expect(safeReturnPath("/admin", "de")).toBe("/de");
    expect(safeReturnPath("/nl/ontdekken?ulke=nl")).toBe("/nl/ontdekken?ulke=nl");
    // Eski adresler yeni yerel adrese çevrilir
    expect(safeReturnPath("/sehir/istanbul/kadikoy?yasMin=30")).toBe("/tr/konum/tr/istanbul/kadikoy?yasMin=30");
  });
});
