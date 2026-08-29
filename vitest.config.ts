import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    env: { NODE_ENV: "test", IP_HASH_SECRET: "test-secret", ADMIN_USER: "mod", ADMIN_PASSWORD: "secret-pass" },
  },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
