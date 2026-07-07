import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Admin route smoke-test config (b108-2gm).
 *
 * Kept separate from `vite.config.ts` so route tests can run without the
 * inline-sprite plugin. Uses jsdom to give React Query, react-router, and
 * the shared surfaces a DOM to mount into.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(here, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    setupFiles: ["./src/routes/__tests__/setup.ts"],
  },
});
