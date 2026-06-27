/**
 * SsoAuthorizeConsentModal — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Three mandatory sections (verify / receive / authorizes)
 *     render in fixed order with verbatim labels.
 *   * Identity DID renders in --font-mono (defence-in-depth
 *     against impersonation: the user reads the wire key, not
 *     just a display name).
 *   * The `‡ from {instance}` chip uses --remote chrome.
 *   * "NOT a login" callout copy is verbatim, in --warn-soft.
 *   * Esc / scrim click → decline (never approve — no implicit
 *     consent).
 *   * Approve CTA does NOT collect credentials.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  SsoAuthorizeConsentModal,
} from "./SsoAuthorizeConsentModal.js";
import {
  SSO_APPROVE,
  SSO_DECLINE,
  SSO_LABEL_AUTHORIZES,
  SSO_LABEL_RECEIVE,
  SSO_LABEL_VERIFY,
  SSO_NOT_A_LOGIN,
} from "./copy.js";

const PROPS = {
  hubName: "The Hermetic Circle",
  fromInstance: "aurora.example",
  identityDid: "did:theourgia:hearth.sophia.example:sophia",
  willReceive:
    "Your display name · your tradition tag(s) · nothing else",
  authorizes:
    "Joining this hub. Specifically THIS join request. The assertion expires in 24 hours and can be revoked any time from Settings → SSO.",
};

function renderModal(
  overrides: Partial<
    Parameters<typeof SsoAuthorizeConsentModal>[0]
  > = {},
) {
  const onDecline = vi.fn();
  const onApprove = vi.fn();
  const result = render(
    <SsoAuthorizeConsentModal
      {...PROPS}
      onDecline={onDecline}
      onApprove={onApprove}
      {...overrides}
    />,
  );
  return { ...result, onDecline, onApprove };
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("SsoAuthorizeConsentModal — chrome", () => {
  it("renders the title as '{hubName} is requesting access'", () => {
    renderModal();
    expect(
      screen.getByText("The Hermetic Circle is requesting access"),
    ).toBeInTheDocument();
  });

  it("renders the `‡ from {instance}` chip in --remote chrome", () => {
    renderModal();
    const chip = document.querySelector(
      "[data-field='from-chip']",
    ) as HTMLElement;
    expect(chip.textContent).toContain("‡");
    expect(chip.textContent).toContain("from aurora.example");
    expect(chip.style.color).toContain("--remote");
    // Never --danger.
    expect(chip.style.color).not.toContain("--danger");
  });

  it("aria-modal='true' + aria-label='Access request'", () => {
    renderModal();
    const dialog = document.querySelector(
      "[data-modal='sso-authorize-consent']",
    ) as HTMLElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Access request");
  });
});

// ─── Three mandatory sections ────────────────────────────────────

describe("SsoAuthorizeConsentModal — mandatory sections", () => {
  it("renders verify / receive / authorizes labels verbatim", () => {
    renderModal();
    expect(screen.getByText(SSO_LABEL_VERIFY)).toBeInTheDocument();
    expect(screen.getByText(SSO_LABEL_RECEIVE)).toBeInTheDocument();
    expect(screen.getByText(SSO_LABEL_AUTHORIZES)).toBeInTheDocument();
  });

  it("section order is verify → receive → authorizes", () => {
    renderModal();
    const labels = Array.from(
      document.querySelectorAll("[data-field='verify'], [data-field='receive'], [data-field='authorizes']"),
    ).map((el) => el.getAttribute("data-field"));
    expect(labels).toEqual(["verify", "receive", "authorizes"]);
  });

  it("identity DID renders in --font-mono", () => {
    renderModal();
    const verifyValue = document.querySelector(
      "[data-field='verify-value']",
    ) as HTMLElement;
    expect(verifyValue.textContent).toBe(PROPS.identityDid);
    expect(verifyValue.style.fontFamily).toContain("font-mono");
  });

  it("'will receive' renders verbatim minimal-data line", () => {
    renderModal();
    expect(
      document.querySelector("[data-field='receive-value']")
        ?.textContent,
    ).toBe(PROPS.willReceive);
  });

  it("'authorizes' renders the full scope + expiry + revoke path", () => {
    renderModal();
    const body = document.querySelector(
      "[data-field='authorizes-value']",
    ) as HTMLElement;
    expect(body.textContent).toContain("Joining this hub.");
    expect(body.textContent).toContain("expires in 24 hours");
    expect(body.textContent).toContain("Settings → SSO");
  });

  it("throws if any mandatory section is empty", () => {
    const onDecline = vi.fn();
    const onApprove = vi.fn();
    expect(() =>
      render(
        <SsoAuthorizeConsentModal
          {...PROPS}
          authorizes=""
          onDecline={onDecline}
          onApprove={onApprove}
        />,
      ),
    ).toThrow();
  });
});

// ─── NOT a login callout ─────────────────────────────────────────

describe("SsoAuthorizeConsentModal — NOT a login callout", () => {
  it("renders the verbatim copy", () => {
    renderModal();
    const callout = document.querySelector(
      "[data-field='not-a-login-callout']",
    ) as HTMLElement;
    expect(callout.textContent).toContain(SSO_NOT_A_LOGIN);
  });

  it("uses --warn-soft chrome (never --danger)", () => {
    renderModal();
    const callout = document.querySelector(
      "[data-field='not-a-login-callout']",
    ) as HTMLElement;
    expect(callout.style.background).toContain("--warn-soft");
    expect(callout.style.background).not.toContain("--danger");
  });
});

// ─── Consent affordances ─────────────────────────────────────────

describe("SsoAuthorizeConsentModal — consent affordances", () => {
  it("Approve fires onApprove (NOT onDecline)", () => {
    const { onApprove, onDecline } = renderModal();
    fireEvent.click(screen.getByText(SSO_APPROVE));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("Decline fires onDecline (NOT onApprove)", () => {
    const { onApprove, onDecline } = renderModal();
    fireEvent.click(screen.getByText(SSO_DECLINE));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("Escape → decline (never approve)", () => {
    const { onApprove, onDecline } = renderModal();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("scrim click → decline (never approve)", () => {
    const { onApprove, onDecline } = renderModal();
    const scrim = document.querySelector(
      "[data-surface='sso-authorize-consent']",
    ) as HTMLElement;
    fireEvent.click(scrim);
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("no credential inputs are rendered (no password/text fields)", () => {
    renderModal();
    const passwords = document.querySelectorAll(
      "input[type='password']",
    );
    const texts = document.querySelectorAll("input[type='text']");
    expect(passwords).toHaveLength(0);
    expect(texts).toHaveLength(0);
  });

  it("Approve CTA uses --accent chrome", () => {
    renderModal();
    const approve = document.querySelector(
      "[data-action='approve']",
    ) as HTMLElement;
    expect(approve.style.background).toContain("--accent");
  });
});
