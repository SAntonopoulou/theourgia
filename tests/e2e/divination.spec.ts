/**
 * Divination flow — cast a tarot spread and see a reading render.
 *
 * The tarot surface draws client-side (deterministic seed), so a
 * spread is already laid on mount; "Shuffle & draw again" performs a
 * fresh cast. We assert the reading rail + board render a result — not
 * any specific card (card copy is not a stable contract).
 */

import { expect, test } from "@playwright/test";

import { signInFresh, uniqueName } from "./helpers";

test("cast a tarot spread and see a reading", async ({ page }) => {
  await signInFresh(page, uniqueName("Vates"));

  await page.goto("/divination/tarot");

  const surface = page.locator('[data-component="tarot-surface"]');
  await expect(surface).toBeVisible({ timeout: 20_000 });

  // Perform a cast.
  await page.locator('[data-action="reshuffle"]').click();

  // A reading renders: the rail shows the drawn card, the board is
  // laid, and the save-to-journal affordance is offered.
  await expect(
    page.locator('[data-component="card-reading-rail"][data-state="drawn"]'),
  ).toBeVisible();
  await expect(page.locator("[data-board-frame]")).toBeVisible();
  await expect(page.locator('[data-action="save"]')).toBeVisible();
});
