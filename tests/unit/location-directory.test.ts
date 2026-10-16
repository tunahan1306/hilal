import { describe, expect, it } from "vitest";
import { createLocationDirectory } from "@/domain/location-directory";
import { productionConfigErrors } from "@/server/env";

describe("database location directory", () => {
  it("does not replace an empty database catalog with bundled locations", () => {
    const directory = createLocationDirectory({ provinces: [], districts: [] });
    expect(directory.listProvinces()).toEqual([]);
    expect(directory.getProvince("istanbul")).toBeUndefined();
    expect(directory.getDistrict("istanbul", "atasehir")).toBeUndefined();
  });
  it("requires Supabase on Vercel production even when demo is explicitly enabled", () => {
    const errors = productionConfigErrors({ NODE_ENV: "production", VERCEL_ENV: "production", ALLOW_DEMO_MODE: "true", IP_HASH_SALT: "x".repeat(32), SESSION_SECRET: "x".repeat(32), DEMO_ADMIN_PASSWORD: "x".repeat(12), DEMO_ADMIN_TOTP_SECRET: "x".repeat(16) });
    expect(errors).toContain("Vercel production için Supabase zorunlu (demo yasak)");
  });
});
