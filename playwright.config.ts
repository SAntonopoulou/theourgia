/**
 * End-to-end config (Playwright) — v1-042.
 *
 * Separate from the Storybook-driven suites
 * (`playwright.a11y.config.ts`, `playwright.visual.config.ts`) so the
 * three run on their own cadences without colliding:
 *
 *   | suite  | testDir        | project name  | target                 |
 *   |--------|----------------|---------------|------------------------|
 *   | a11y   | ./tests/a11y   | chromium      | Storybook static :6007 |
 *   | visual | ./tests/visual | chromium      | Storybook static :6007 |
 *   | e2e    | ./tests/e2e    | e2e-chromium  | a running app stack    |
 *
 * Unlike the Storybook suites, this config does NOT bring the stack up
 * itself. Spinning the full Docker stack (Postgres + Redis + backend +
 * Celery + admin + public-site) from Playwright's `webServer` is slow
 * and fragile — a partially-healthy stack produces confusing failures
 * that look like test bugs. Instead the OPERATOR (or CI) starts the
 * stack, then runs the suite. See `docs/dev/testing.md` for the exact
 * bring-up command.
 *
 * Targets are env-driven (both `E2E_*` and the bare names are honoured):
 *
 *   E2E_BASE_URL   / BASE_URL    admin SPA origin   (default :5173)
 *   E2E_API_URL    / API_URL     backend origin     (default :8000)
 *   E2E_PUBLIC_URL / PUBLIC_URL  public-site origin (default :4321)
 *
 * IMPORTANT: the admin SPA talks to the backend at its OWN origin
 * (`/api/*`, same-origin) and session auth rides an HTTP cookie, so
 * the full suite needs admin + api served on ONE origin (a reverse
 * proxy, e.g. the internal Caddy). The split dev ports above are the
 * defaults only; `docs/dev/testing.md` explains the single-origin
 * requirement and how to satisfy it.
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  // Fresh magickal names are created via open enrollment; the very
  // first account also trips the first-run wizard. Running serially
  // keeps that deterministic and the (small) suite readable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      // Functional flows on a desktop viewport. Excludes the responsive
      // sweep, which is a mobile-only concern.
      name: "e2e-chromium",
      testIgnore: /responsive\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      // Mobile viewport (iPhone 13, 390×844) — drives ONLY the
      // responsive overflow sweep. Every key surface must fit the
      // narrow viewport without a horizontal scrollbar.
      name: "mobile-chromium",
      testMatch: /responsive\.spec\.ts/,
      use: {
        // iPhone 13 metrics (390×844, mobile UA, touch, DPR 3) but run
        // on Chromium — the only engine installed here — rather than the
        // descriptor's default WebKit.
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
      },
    },
  ],
});
