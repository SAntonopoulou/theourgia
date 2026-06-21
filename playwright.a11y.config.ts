/**
 * Accessibility config — runs ``@axe-core/playwright`` against every
 * Storybook story and fails on WCAG 2.2 A/AA violations.
 *
 * Same harness as the visual-regression suite (serves the prebuilt
 * Storybook static, walks ``index.json``), with axe assertions per
 * story instead of pixel diffs.
 *
 * Strategy aligns with Phase 02's "axe-core passes" DoD item without
 * depending on a SaaS like accessibe / equally.io.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/a11y",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"] ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:6007",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  webServer: {
    command:
      "npx --yes serve -p 6007 -L --no-clipboard frontend/shared/storybook-static",
    url: "http://127.0.0.1:6007/index.html",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
