import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        settings: {
          // Tests render <iframe> embeds (videoEmbed) purely to
          // assert on attributes — never fetch the embed hosts.
          disableIframePageLoading: true,
        },
      },
    },
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
