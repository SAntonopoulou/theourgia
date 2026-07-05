import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const SHARED = resolve(here, "../shared/src/tokens");

/**
 * Inline the engraving icon sprite into <body> at build time so every
 * <Glyph> reference (`<use href="#theo-foo" />`) resolves from the same
 * document, with no extra fetch and no same-origin worries.
 */
function inlineSprite(): Plugin {
  return {
    name: "theourgia-inline-sprite",
    transformIndexHtml(html) {
      const sprite = readFileSync(resolve(SHARED, "theourgia-icons.svg"), "utf8");
      return html.replace(
        "<!--SPRITE-->",
        `<div aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${sprite}</div>`,
      );
    },
  };
}

export default defineConfig(({ command }) => ({
  // Dev: serve at /. Build: emit asset URLs under /app/ so the SPA can
  // be mounted at https://theourgia.com/app/ behind the internal Caddy.
  base: command === "build" ? "/app/" : "/",
  plugins: [react(), inlineSprite()],
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
      "@": resolve(here, "./src"),
    },
  },
  build: {
    // Split heavy third-party libs into their own chunks so the
    // long-lived cache survives app-code updates. First paint fetches
    // a smaller main chunk; library chunks are fetched in parallel.
    // Vite 8 uses rolldown; manualChunks MUST be a function.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }
            if (
              id.includes("/@tiptap/") ||
              id.includes("/prosemirror-")
            ) {
              return "vendor-tiptap";
            }
            if (id.includes("/@tanstack/")) {
              return "vendor-query";
            }
          }
          return undefined;
        },
      },
    },
  },
}));
