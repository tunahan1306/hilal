import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3217);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // Demo modu tek süreçte bellek içi veri kullanır.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "tr-TR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: process.env.E2E_SUPABASE
      ? { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` }
      : { ALLOW_DEMO_MODE: "true", NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
