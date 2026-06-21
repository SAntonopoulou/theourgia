/**
 * Accessibility CI gate — one axe-core scan per Storybook story.
 *
 * Reads the storybook ``index.json`` and runs ``@axe-core/playwright``
 * against each iframe URL with the WCAG 2.2 A + AA rulesets enabled.
 *
 * **The bar is "zero violations on the design-system substrate."**
 * Stories that compose primitives in a way that intentionally violates
 * a rule (e.g. demonstrating a contrast trade-off) can be allowlisted
 * via the ``ALLOWLIST`` map below, with a one-line *why*.
 *
 * Run:
 *
 *   pnpm build:storybook && pnpm test:a11y
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

interface IndexEntry {
  type: "story" | "docs";
  id: string;
  name: string;
  title: string;
}

interface StoryIndex {
  v: number;
  entries: Record<string, IndexEntry>;
}

const STORYBOOK_DIR = resolve(__dirname, "../../frontend/shared/storybook-static");
const INDEX_FILE = resolve(STORYBOOK_DIR, "index.json");

/**
 * Per-story rule allowlist. Map keys are full story IDs; values are
 * an array of axe rule IDs to skip *for that story only*. Every entry
 * needs a comment explaining why — the goal is to never silence a real
 * violation, only to silence an intentional design-system demo case.
 */
const ALLOWLIST: Record<string, string[]> = {
  // Foundations/Tokens stories render bare color swatches with the hex
  // value as the only label; the swatch itself is decorative
  // (aria-hidden). axe's color-contrast rule flags the swatch surface
  // even though it's not text. False positive on swatch demonstrators.
  "foundations-tokens--palette": ["color-contrast"],
};

function loadStories(): IndexEntry[] {
  if (!existsSync(INDEX_FILE)) {
    throw new Error(
      `Storybook static index not found at ${INDEX_FILE}. ` +
        `Run \`pnpm build:storybook\` first.`,
    );
  }
  const raw = readFileSync(INDEX_FILE, "utf8");
  const data = JSON.parse(raw) as StoryIndex;
  return Object.values(data.entries).filter((e) => e.type === "story");
}

const STORIES = loadStories();

test.describe("Storybook accessibility (WCAG 2.2 A + AA)", () => {
  for (const story of STORIES) {
    test(`${story.title} · ${story.name}`, async ({ page }) => {
      const url = `/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
      await page.goto(url, { waitUntil: "networkidle" });

      // Fonts must be loaded before axe runs so font-size measurements
      // are accurate.
      await page.evaluate(() => document.fonts.ready);

      const builder = new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "wcag22aa",
      ]);

      const disabled = ALLOWLIST[story.id];
      if (disabled?.length) {
        builder.disableRules(disabled);
      }

      const result = await builder.analyze();

      // Surface the violations in the test output before asserting.
      if (result.violations.length > 0) {
        // eslint-disable-next-line no-console
        console.log(
          `\n${story.title} · ${story.name} — ${result.violations.length} violation(s):`,
        );
        for (const v of result.violations) {
          // eslint-disable-next-line no-console
          console.log(`  · [${v.id}] ${v.help} (impact: ${v.impact})`);
          for (const node of v.nodes.slice(0, 3)) {
            // eslint-disable-next-line no-console
            console.log(`      ${node.target.join(" ")}`);
          }
        }
      }

      expect(result.violations).toEqual([]);
    });
  }
});
