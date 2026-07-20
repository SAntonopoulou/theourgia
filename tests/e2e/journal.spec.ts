/**
 * Journal flow — write, auto-save, tag, and publish an entry.
 *
 * The load-bearing regressions for v1.0: the editor debounced
 * auto-save actually persists (survives a reload), tags stick, and
 * the publish CTA transitions the entry to a published state.
 */

import { expect, test } from "@playwright/test";

import { signInFresh, uniqueName, waitForAutosave } from "./helpers";

test("write, auto-save, tag, and publish a journal entry", async ({ page }) => {
  await signInFresh(page, uniqueName("Scriba"));

  // Create a new entry from the Journal surface.
  await page.goto("/journal");
  await page.getByRole("button", { name: "New entry" }).click();
  await page.waitForURL(/\/editor\/[^/?#]+/, { timeout: 30_000 });
  // Let the entry-detail fetch settle before typing: on load the editor
  // seeds the title input from the fetched record, which would race a
  // too-early fill.
  await page.waitForLoadState("networkidle");

  const title = `Rite of testing ${Date.now()}`;
  const bodyText = "The lamp is lit and the circle is drawn.";

  // Title, then body. Clicking into the editor blurs the title input,
  // which persists it (PATCH on blur).
  await page.getByLabel("Entry title").fill(title);
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type(bodyText);

  await waitForAutosave(page);

  // Reload — the content must survive the round-trip to the backend.
  await page.reload();
  await expect(page.getByLabel("Entry title")).toHaveValue(title);
  await expect(page.locator(".ProseMirror").first()).toContainText(bodyText);

  // Add a tag. `exact` disambiguates from the "Tradition tags — …" row,
  // whose accessible name contains this substring.
  const tagInput = page.getByLabel("Tags — type and press Enter to add", { exact: true });
  await tagInput.fill("evocation");
  await tagInput.press("Enter");
  await expect(page.getByRole("button", { name: "Remove evocation" })).toBeVisible();

  // Publish.
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("button", { name: "Published", exact: true })).toBeVisible();
});
