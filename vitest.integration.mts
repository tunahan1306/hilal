import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Gerçek (yerel) Supabase'e karşı entegrasyon testleri: `npm run test:integration` */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/unit/setup.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
