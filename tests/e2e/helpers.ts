/**
 * Shared E2E helpers (v1-042).
 *
 * Selectors here prefer roles / accessible names / real UI copy over
 * brittle CSS. Where a stable `data-*` hook already exists in the app
 * (the Tiptap ProseMirror surface, the visibility pills, the tarot
 * board) we use it; we do NOT assert on styling.
 *
 * Auth model (dev): open enrollment — POST /api/v1/auth/demo-signin
 * find-or-creates a user for any magickal name when
 * THEOURGIA_ALLOWED_MAGICKAL_NAMES is empty. The FIRST user on a fresh
 * vault is created through the first-run wizard at /setup; every user
 * after that signs in through /signin. `signInFresh` handles both.
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const BASE_URL = process.env.E2E_BASE_URL ?? process.env.BASE_URL ?? "http://127.0.0.1:5173";
export const API_URL = process.env.E2E_API_URL ?? process.env.API_URL ?? "http://127.0.0.1:8000";
export const PUBLIC_URL =
  process.env.E2E_PUBLIC_URL ?? process.env.PUBLIC_URL ?? "http://127.0.0.1:4321";

let seq = 0;

/**
 * A unique magickal name per invocation so specs never collide with
 * each other or with a re-run against the same database.
 */
export function uniqueName(prefix = "Soror"): string {
  seq += 1;
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix} E2E ${stamp}-${seq}-${rand}`;
}

/**
 * The identity label the app displays for a given magickal name.
 *
 * The dev backend derives the shown handle from the name by slugging
 * it (`backend/.../auth.py::_slug`): lowercase, every run of
 * non-`[a-z0-9]` collapses to a single hyphen, ends trimmed, capped at
 * 32 chars. The acting-as switcher echoes THIS handle, not the raw
 * name — so display assertions must compare against the handle.
 */
export function handleFor(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (slug || "demo").slice(0, 32);
}

/**
 * Assert we've landed in the authenticated app shell. The acting-as
 * switcher in the topbar only renders when there is a live session,
 * so its presence is a reliable "signed in + chrome mounted" signal.
 */
export async function expectAppShell(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Switch acting identity" })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Complete the first-run wizard (only shown for the very first user on
 * an empty vault). Steps: welcome → name → traditions → calendars →
 * review → "Open the vault".
 */
async function completeSetupWizard(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Next" }).click(); // welcome → name
  await page.getByLabel("Your magickal name").fill(name);
  await page.getByRole("button", { name: "Next" }).click(); // name → traditions
  await page.getByRole("button", { name: "Next" }).click(); // traditions → calendars
  await page.getByRole("button", { name: "Next" }).click(); // calendars → review
  await page.getByRole("button", { name: "Open the vault" }).click();
}

/** Sign in via the /signin magickal-name form (provisioned vault). */
async function signInWithName(page: Page, name: string, password?: string): Promise<void> {
  await page.getByRole("button", { name: "Continue with magickal name" }).click();
  await page.getByLabel("Magickal name").fill(name);
  if (password !== undefined && password.length > 0) {
    await page.getByLabel("Password", { exact: true }).fill(password);
  }
  await page.getByRole("button", { name: "Continue" }).click();
}

/**
 * Open (or create) the vault for a fresh magickal name and assert the
 * app shell renders. Robust to whether this is the first-ever user
 * (first-run wizard) or a later one (sign-in form).
 */
export async function signInFresh(page: Page, name: string): Promise<void> {
  await page.goto("/signin");

  // The /signin surface redirects an empty vault to the /setup wizard.
  // Wait for the session-status fetch (and any redirect) to settle,
  // THEN branch on the settled URL — a deterministic signal rather than
  // a race between two locators that a redirect transition can flake.
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/setup")) {
    await completeSetupWizard(page, name);
  } else {
    await signInWithName(page, name);
  }

  await expectAppShell(page);
}

/** Sign out via the topbar acting-as switcher; lands on /signin. */
export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Switch acting identity" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/signin(\?|#|$)/, { timeout: 20_000 });
}

/**
 * Wait for the editor's debounced auto-save to report success. The
 * SaveStatusIndicator is an aria-live `status` region whose text
 * settles on "Saved · just now".
 */
export async function waitForAutosave(page: Page): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: /Saved/ }).first()).toBeVisible({
    timeout: 20_000,
  });
}

/** Extract the entry id from an /editor/:id URL, or throw. */
export function entryIdFromUrl(url: string): string {
  const match = url.match(/\/editor\/([^/?#]+)/);
  const id = match?.[1];
  if (!id) throw new Error(`Could not read an entry id from URL: ${url}`);
  return id;
}
