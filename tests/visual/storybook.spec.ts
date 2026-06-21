/**
 * Visual regression — one screenshot per Storybook story.
 *
 * Reads the storybook ``index.json`` at run-time to enumerate every
 * story dynamically, so new stories are picked up automatically with no
 * spec maintenance.
 *
 * Baselines are committed under
 * ``tests/visual/storybook.spec.ts-snapshots/`` and reviewed via diff
 * like any other code artifact.
 *
 * To capture / refresh baselines after an intended visual change:
 *
 *   pnpm build:storybook && pnpm test:visual:update
 *
 * To check for drift:
 *
 *   pnpm build:storybook && pnpm test:visual
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

interface IndexEntry {
  type: "story" | "docs";
  id: string;
  name: string;
  title: string;
  importPath: string;
  tags?: string[];
}

interface StoryIndex {
  v: number;
  entries: Record<string, IndexEntry>;
}

const STORYBOOK_DIR = resolve(__dirname, "../../frontend/shared/storybook-static");
const INDEX_FILE = resolve(STORYBOOK_DIR, "index.json");

// Stories tagged with these keys are skipped — usually because they
// have time-dependent content (e.g. CelestialBand reads `new Date()`
// internally for the indeterminate state) or platform-dependent
// rendering (fonts not in CI).
const SKIP_PATTERNS = [
  // CelestialBand stories pin `now` to a fixed Date; safe to include.
  // Add patterns here if any story produces non-determinism that fails
  // visual-diff even at threshold 2%.
];

function loadStories(): IndexEntry[] {
  if (!existsSync(INDEX_FILE)) {
    throw new Error(
      `Storybook static index not found at ${INDEX_FILE}. ` +
        `Run \`pnpm build:storybook\` first.`,
    );
  }
  const raw = readFileSync(INDEX_FILE, "utf8");
  const data = JSON.parse(raw) as StoryIndex;
  return Object.values(data.entries)
    .filter((e) => e.type === "story")
    .filter((e) => !SKIP_PATTERNS.some((p) => e.id.includes(p)));
}

const STORIES = loadStories();

test.describe("Storybook visual regression", () => {
  for (const story of STORIES) {
    test(`${story.title} · ${story.name}`, async ({ page }) => {
      // Iframe URL with viewMode=story strips Storybook chrome so the
      // screenshot captures just the component.
      const url = `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
      await page.goto(url, { waitUntil: "networkidle" });

      // Disable animations + transitions so any easing curve doesn't
      // introduce timing-dependent flake.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0ms !important;
            animation-delay: 0ms !important;
            transition-duration: 0ms !important;
            transition-delay: 0ms !important;
            caret-color: transparent !important;
          }
        `,
      });

      // Wait for fonts to settle. Critical for screenshot stability —
      // a story rendered before Cardo loads will diff against a baseline
      // rendered after it.
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`${story.id}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
