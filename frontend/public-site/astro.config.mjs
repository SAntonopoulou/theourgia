import { defineConfig } from "astro/config";

// Tailwind integration: PostCSS-based (see `postcss.config.cjs` +
// `tailwind.config.ts`). The old `@astrojs/tailwind` integration was
// removed during the Astro 4 → 6 upgrade because its peer is capped at
// `astro@^5`. The admin SPA already uses the same PostCSS pipeline, so
// the workspace stays consistent on Tailwind v3 + the shared
// `@theourgia/shared/tokens/tailwind-preset`.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
});
