/**
 * Blog flow — publish a public entry and read it on the public site.
 *
 * A blog post is any entry with visibility=public that isn't sealed
 * (see backend `blog.py`). So the flow is: write → make Public (via
 * the visibility chip → Public pill → confirm) → Publish → read.
 *
 * We assert twice, for robustness:
 *   1. The backend blog API returns the public post (origin-independent
 *      — the endpoint is public, needs no session cookie).
 *   2. The public reader page renders the title + body.
 *
 * NOTE: step 2 requires the public-site origin (E2E_PUBLIC_URL) to
 * resolve `/api/*` to the backend (the reader fetches same-origin).
 * On a single-origin stack this is automatic; see docs/dev/testing.md.
 */

import { expect, test } from "@playwright/test";

import {
  API_URL,
  PUBLIC_URL,
  entryIdFromUrl,
  signInFresh,
  uniqueName,
  waitForAutosave,
} from "./helpers";

test("publish a public entry and read it on the blog", async ({ page }) => {
  await signInFresh(page, uniqueName("Herald"));

  // Fresh draft (auto-created, then redirected onto /editor/:id).
  await page.goto("/editor");
  await page.waitForURL(/\/editor\/[^/?#]+/, { timeout: 30_000 });
  const id = entryIdFromUrl(page.url());

  const title = `Public dispatch ${Date.now()}`;
  const bodyText = "A note the world may read.";

  await page.getByLabel("Entry title").fill(title);
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type(bodyText);
  await waitForAutosave(page);

  // Make it public: open the visibility chip, click the Public pill,
  // confirm the downgrade dialog ("Publish entry").
  await page.getByRole("button", { name: /^Visibility/ }).click();
  await page.locator('[data-visibility-level="public"]').click();
  await page.getByRole("button", { name: "Publish entry" }).click();

  // Dismiss the still-open visibility menu with a neutral click before
  // reaching for the topbar Publish CTA.
  await page.getByLabel("Entry title").click();

  // Publish (stamps published_at).
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("button", { name: "Published", exact: true })).toBeVisible();

  // 1) Backend blog API exposes the public post.
  const apiRes = await page.request.get(`${API_URL}/api/v1/blog/posts/${id}`);
  expect(apiRes.ok()).toBeTruthy();
  const post = (await apiRes.json()) as { title?: string };
  expect(post.title).toBe(title);

  // 2) Public reader renders the content.
  await page.goto(`${PUBLIC_URL}/blog-read?id=${id}`);
  await expect(page.locator("#post-title")).toHaveText(title);
  await expect(page.locator("#post-content")).toContainText(bodyText);
});
