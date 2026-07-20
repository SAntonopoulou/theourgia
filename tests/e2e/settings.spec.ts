/**
 * Settings flow — set an account password.
 *
 * Before a password exists the surface shows a care-toned first-run
 * banner ("Set a password now."). After a successful set, the banner
 * clears and the surface reports success + flips the CTA to "Change
 * password". We assert copy + success state only, never styling
 * (the care palette is validated in the Storybook a11y/visual suites).
 */

import { expect, test } from "@playwright/test";

import { signInFresh, uniqueName } from "./helpers";

test("set a password clears the banner and shows success", async ({ page }) => {
  await signInFresh(page, uniqueName("Praxis"));

  await page.goto("/settings/password");

  // First-run care banner is present while no password is set.
  const banner = page.getByText(/Set a password now/);
  await expect(banner).toBeVisible();

  await page.getByLabel(/^New password/).fill("passphrase-01");
  await page.getByLabel("Confirm new password").fill("passphrase-01");
  await page.getByRole("button", { name: "Set password" }).click();

  // Success message, banner gone, CTA now offers a change.
  await expect(page.getByText(/Password saved/)).toBeVisible();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
});
