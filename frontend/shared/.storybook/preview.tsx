/**
 * Storybook preview — wires the Theourgia design system into every story.
 *
 * Imports both the token stylesheet (palette + radii + fonts) and the
 * shared rule sheet (resets, scrollbars, ``.om-aside`` responsive drawer)
 * so primitives render with full design-system context.
 *
 * Adds two custom globals so stories can be flipped through the four
 * theme axes from the Storybook toolbar:
 *   · ``theme`` → base / hellenic / thelemic  (sets ``data-theme``)
 *   · ``mode``  → dark / light                (sets ``data-mode``)
 *
 * `decorators[0]` then writes those globals to ``<html>`` so the CSS
 * cascade resolves against the right palette + font-display.
 */
import type { Preview } from "@storybook/react";
import { useEffect } from "react";

import "../src/tokens/theourgia.tokens.css";
import "../src/tokens/theourgia.shared.css";

// Inline the engraving icon sprite into <body> so every <use href="#theo-X"/>
// reference resolves locally. Matches the production setup (admin's Vite
// plugin + public-site's Astro layout). Without this the icon stories
// + every primitive that depends on Glyph render blank.
//
// biome-ignore lint/style/useImportType: side-effect import (Vite ?raw query
// returns a string at module init that we then inject into the DOM).
import sprite from "../src/tokens/theourgia-icons.svg?raw";

function injectSprite() {
  if (typeof document === "undefined") return;
  if (document.getElementById("theourgia-icon-sprite") !== null) return;
  const host = document.createElement("div");
  host.id = "theourgia-icon-sprite";
  host.setAttribute("aria-hidden", "true");
  host.style.position = "absolute";
  host.style.width = "0";
  host.style.height = "0";
  host.style.overflow = "hidden";
  host.innerHTML = sprite as unknown as string;
  document.body.appendChild(host);
}

const THEMES = [
  { value: "base", title: "Base" },
  { value: "hellenic", title: "Hellenic" },
  { value: "thelemic", title: "Thelemic" },
];
const MODES = [
  { value: "dark", title: "Dark" },
  { value: "light", title: "Light" },
];

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
      expanded: true,
    },
    layout: "padded",
    backgrounds: {
      // Use the design's surface tokens so the canvas matches what
      // the primitive will look like in-app, not Storybook's defaults.
      default: "surface",
      values: [
        { name: "surface", value: "var(--bg)" },
        { name: "raised", value: "var(--bg-2)" },
        { name: "sunk", value: "var(--bg-sunk)" },
      ],
    },
    options: {
      storySort: {
        order: ["Foundations", "Primitives", "Overlays", "Chrome", "Identity"],
      },
    },
  },
  globalTypes: {
    theme: {
      name: "Tradition",
      description: "Tradition palette (Base / Hellenic / Thelemic)",
      defaultValue: "base",
      toolbar: {
        icon: "circlehollow",
        items: THEMES,
        showName: true,
      },
    },
    mode: {
      name: "Mode",
      description: "Dark / Light",
      defaultValue: "dark",
      toolbar: {
        icon: "contrast",
        items: MODES,
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals.theme as string) ?? "base";
      const mode = (context.globals.mode as string) ?? "dark";
      // biome-ignore lint/correctness/useHookAtTopLevel: decorator pattern
      useEffect(() => {
        const root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.setAttribute("data-mode", mode);
        injectSprite();
      }, [theme, mode]);
      return <Story />;
    },
  ],
};

export default preview;
