/**
 * Auth flow — sign in, sign out, and the b108-2hl security property.
 *
 * A v1.0 must never regress: (1) a fresh magickal name can open a
 * vault and reach the app shell, and (2) once a password is set,
 * name-only sign-in is REFUSED (the hole where anyone who knew the
 * magickal name could sign in as the owner).
 */

import { expect, test } from "@playwright/test";

import { expectAppShell, signInFresh, signOut, uniqueName } from "./helpers";

test.describe("authentication", () => {
  test("fresh magickal name opens the vault, then signs out", async ({ page }) => {
    const name = uniqueName("Soror");

    await signInFresh(page, name);
    await expectAppShell(page);

    // The acting-as switcher echoes the signed-in identity.
    await expect(page.getByRole("button", { name: "Switch acting identity" })).toContainText(name);

    await signOut(page);

    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByRole("heading", { name: "Enter or open the vault" })).toBeVisible();
  });

  test("after a password is set, name-only sign-in is refused (b108-2hl)", async ({ page }) => {
    const name = uniqueName("Custos");
    const password = "correct-horse-battery";

    await signInFresh(page, name);

    // Set a password.
    await page.goto("/settings/password");
    await page.getByLabel(/^New password/).fill(password);
    await page.getByLabel("Confirm new password").fill(password);
    await page.getByRole("button", { name: "Set password" }).click();
    await expect(page.getByText(/Password saved/)).toBeVisible();

    await signOut(page);

    // Attempt sign-in with the name only — leave the password blank.
    await page.getByRole("button", { name: "Continue with magickal name" }).click();
    await page.getByLabel("Magickal name").fill(name);
    await page.getByRole("button", { name: "Continue" }).click();

    // The vault must NOT open: the password field is still there and we
    // never reach the app shell.
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/signin/);
    await expect(page.getByRole("button", { name: "Switch acting identity" })).toHaveCount(0);
  });
});
