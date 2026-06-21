/**
 * Visual regression config — captures a screenshot of every Storybook
 * story and compares against the committed baselines in
 * ``tests/visual/storybook.spec.ts-snapshots/``.
 *
 * Separate from ``playwright.config.ts`` (E2E tests) so the visual
 * suite can run on its own cadence and use a different
 * ``snapshotPathTemplate`` / threshold.
 *
 * **No SaaS dependency.** Storybook builds locally; Playwright serves
 * the static output and compares pixel diffs against committed PNGs.
 * Matches the project's zero-telemetry stance.
 *
 * Strategy:
 *   1. Build the Storybook static bundle into
 *      ``frontend/shared/storybook-static/``.
 *   2. Spin up a local static server on port 6007 with that as the
 *      web root.
 *   3. The spec reads ``index.json`` to enumerate every story, then
 *      visits each iframe URL and snapshots.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"] ? "github" : "list",

  // Snapshot threshold: small enough to catch real regressions, large
  // enough to tolerate sub-pixel font rendering drift between machines.
  // 0.02 = 2% per pixel may differ; 30 px total may differ before fail.
  expect: {
    toHaveScreenshot: {
      threshold: 0.02,
      maxDiffPixels: 30,
    },
  },

  use: {
    baseURL: "http://127.0.0.1:6007",
    trace: "on-first-retry",
    // Disable hovers + animations so transitions don't introduce flake.
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Fixed viewport so screenshots are deterministic. 1280×800 is
        // wide enough to see chrome stories (VaultNav at 248px + body).
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    // Serve the prebuilt Storybook static directory. The build step is
    // a prerequisite — run `pnpm build:storybook` before `pnpm test:visual`,
    // or rely on CI's ordered job dependencies.
    command:
      "npx --yes serve -p 6007 -L --no-clipboard frontend/shared/storybook-static",
    url: "http://127.0.0.1:6007/index.html",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
