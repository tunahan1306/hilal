import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3217);

/** Yalnızca test sunucusu için açık sırlar (production derlemesi varsayılan sırlarla açılmaz). */
const TEST_SECRETS = {
  IP_HASH_SALT: "e2e-ip-hash-salt-0123456789abcdef0123456789",
  SESSION_SECRET: "e2e-session-secret-0123456789abcdef012345678",
  DEMO_ADMIN_PASSWORD: "demo-admin-2026!",
  DEMO_ADMIN_TOTP_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // Demo modu tek süreçte bellek içi veri kullanır.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "tr-TR", storageState: { cookies: [{ name: "hilal_adult", value: "declared-v1", domain: process.env.E2E_BASE_URL ? new URL(process.env.E2E_BASE_URL).hostname : "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: process.env.E2E_SUPABASE
      ? { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, IP_HASH_SALT: TEST_SECRETS.IP_HASH_SALT }
      : { ALLOW_DEMO_MODE: "true", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`, ...TEST_SECRETS },
  },
});
