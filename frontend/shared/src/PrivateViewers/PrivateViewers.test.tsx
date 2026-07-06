/**
 * PrivateViewersSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Modal default scope is NOT full-vault (rule 11 ·
 *     restrictive default).
 *   * Verbatim "This credential is shown ONCE. Save it now."
 *     warning surfaces in --warn ink under the Issue CTA.
 *   * Revoked rows stay in the list (audit) at reduced opacity
 *     + verbatim "Revoked at {ts}" chip.
 *   * Issue credential fires onIssueCredential with the draft.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  PrivateViewersSurface,
  type PrivateViewerRow,
} from "./PrivateViewersSurface.js";
import {
  PV_CANCEL_CTA,
  PV_ISSUE_CTA,
  PV_MODAL_TITLE,
  PV_NEW_VIEWER_CTA,
  PV_SCOPE_LABELS,
  PV_SHOWN_ONCE_WARNING,
  PV_SUBTITLE,
  PV_TITLE,
} from "./copy.js";

const VIEWERS: PrivateViewerRow[] = [
  {
    id: "v-aspasia",
    label: "Student — Aspasia",
    handle: "aspasia@example.com",
    lastUsed: "2 days ago",
    scopeKind: "tag",
    initial: "A",
  },
  {
    id: "v-frater",
    label: "Working partner — V.",
    handle: "@frater-v@terra.example",
    lastUsed: "a week ago",
    scopeKind: "kind",
    initial: "V",
  },
  {
    id: "v-old",
    label: "Former student",
    handle: "old@example.com",
    lastUsed: "3 months ago",
    scopeKind: "full",
    initial: "F",
    revoked: true,
    revokedAt: "12 Apr",
  },
];

function renderPV(
  overrides: Partial<
    Parameters<typeof PrivateViewersSurface>[0]
  > = {},
) {
  return render(
    <PrivateViewersSurface viewers={VIEWERS} {...overrides} />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("PrivateViewersSurface — chrome", () => {
  it("renders the title + subtitle verbatim", () => {
    renderPV();
    expect(screen.getByText(PV_TITLE)).toBeInTheDocument();
    expect(screen.getByText(PV_SUBTITLE)).toBeInTheDocument();
  });

  it("renders the New viewer CTA", () => {
    renderPV();
    expect(screen.getByText(PV_NEW_VIEWER_CTA)).toBeInTheDocument();
  });

  it("renders one row per viewer", () => {
    renderPV();
    expect(
      document.querySelectorAll("[data-viewer-id]"),
    ).toHaveLength(3);
  });
});

// ─── Viewer rows ─────────────────────────────────────────────────

describe("PrivateViewersSurface — viewer rows", () => {
  it("renders the label + scope chip verbatim", () => {
    renderPV();
    const row = document.querySelector(
      "[data-viewer-id='v-aspasia']",
    ) as HTMLElement;
    expect(row.querySelector("[data-field='label']")?.textContent).toBe(
      "Student — Aspasia",
    );
    const scope = row.querySelector("[data-pill='scope']") as HTMLElement;
    expect(scope.textContent).toBe(PV_SCOPE_LABELS.tag);
    expect(scope.getAttribute("data-scope")).toBe("tag");
  });

  it("renders the handle + last-used in --font-mono", () => {
    renderPV();
    const row = document.querySelector(
      "[data-viewer-id='v-aspasia']",
    ) as HTMLElement;
    const handle = row.querySelector(
      "[data-field='handle']",
    ) as HTMLElement;
    expect(handle.textContent).toBe(
      "aspasia@example.com · last used 2 days ago",
    );
    expect(handle.style.fontFamily).toContain("font-mono");
  });

  it("calls onViewerAction with the viewer id on kebab click", () => {
    const onViewerAction = vi.fn();
    renderPV({ onViewerAction });
    const row = document.querySelector(
      "[data-viewer-id='v-frater']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='viewer-kebab']") as HTMLElement,
    );
    expect(onViewerAction).toHaveBeenCalledWith("v-frater");
  });
});

// ─── Revoked rows ────────────────────────────────────────────────

describe("PrivateViewersSurface — revoked rows", () => {
  it("revoked rows stay in the list (audit) at reduced opacity", () => {
    renderPV();
    const row = document.querySelector(
      "[data-viewer-id='v-old']",
    ) as HTMLElement;
    expect(row).not.toBeNull();
    expect(row.getAttribute("data-revoked")).toBe("true");
    expect(parseFloat(row.style.opacity)).toBeLessThan(1);
  });

  it("revoked rows show the verbatim 'Revoked at {ts}' chip", () => {
    renderPV();
    const row = document.querySelector(
      "[data-viewer-id='v-old']",
    ) as HTMLElement;
    const pill = row.querySelector(
      "[data-pill='revoked']",
    ) as HTMLElement;
    expect(pill.textContent).toBe("Revoked at 12 Apr");
    // Pill uses --ink-mute, not --danger.
    expect(pill.style.color).toContain("--ink-mute");
    expect(pill.style.color).not.toContain("--danger");
  });

  it("active rows do NOT render the revoked chip", () => {
    renderPV();
    const row = document.querySelector(
      "[data-viewer-id='v-aspasia']",
    ) as HTMLElement;
    expect(
      row.querySelector("[data-pill='revoked']"),
    ).toBeNull();
  });
});

// ─── New viewer modal ────────────────────────────────────────────

describe("PrivateViewersSurface — new viewer modal", () => {
  it("opens when 'New viewer' is clicked", () => {
    renderPV();
    expect(
      document.querySelector("[data-modal='new-viewer']"),
    ).toBeNull();
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    expect(
      document.querySelector("[data-modal='new-viewer']"),
    ).not.toBeNull();
    expect(screen.getByText(PV_MODAL_TITLE)).toBeInTheDocument();
  });

  it("default scope is NOT 'full' (rule 11 — restrictive default)", () => {
    renderPV();
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    const full = document.querySelector(
      "[data-visual-radio='full']",
    ) as HTMLElement;
    const tag = document.querySelector(
      "[data-visual-radio='tag']",
    ) as HTMLElement;
    expect(full.getAttribute("data-checked")).toBe("false");
    expect(tag.getAttribute("data-checked")).toBe("true");
  });

  it("default delivery is 'signed-link'", () => {
    renderPV();
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    const link = document.querySelector(
      "[data-visual-radio='signed-link']",
    ) as HTMLElement;
    const pass = document.querySelector(
      "[data-visual-radio='passphrase']",
    ) as HTMLElement;
    expect(link.getAttribute("data-checked")).toBe("true");
    expect(pass.getAttribute("data-checked")).toBe("false");
  });

  it("renders the verbatim shown-once warning in --warn ink", () => {
    renderPV();
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    const warning = document.querySelector(
      "[data-field='shown-once-warning']",
    ) as HTMLElement;
    expect(warning.textContent).toBe(PV_SHOWN_ONCE_WARNING);
    expect(warning.style.color).toContain("--warn");
    // Never --danger.
    expect(warning.style.color).not.toContain("--danger");
  });

  it("Issue credential fires onIssueCredential with the draft", () => {
    const onIssueCredential = vi.fn();
    renderPV({ onIssueCredential });
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    const emailInput = document.querySelector(
      "[data-field='email']",
    ) as HTMLInputElement;
    fireEvent.change(emailInput, {
      target: { value: "newviewer@example.com" },
    });
    fireEvent.click(
      document.querySelector("[data-radio='full']") as HTMLElement,
    );
    fireEvent.click(
      document.querySelector("[data-radio='passphrase']") as HTMLElement,
    );
    fireEvent.click(screen.getByText(PV_ISSUE_CTA));
    expect(onIssueCredential).toHaveBeenCalledWith({
      emailOrHandle: "newviewer@example.com",
      // Label field defaults to empty (see b108-2et — magickal-name leak
      // scrub); the user hasn't typed one in this test path.
      label: "",
      scope: "full",
      delivery: "passphrase",
    });
  });

  it("Cancel closes the modal without firing onIssueCredential", () => {
    const onIssueCredential = vi.fn();
    renderPV({ onIssueCredential });
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    fireEvent.click(screen.getByText(PV_CANCEL_CTA));
    expect(
      document.querySelector("[data-modal='new-viewer']"),
    ).toBeNull();
    expect(onIssueCredential).not.toHaveBeenCalled();
  });

  it("scrim click cancels", () => {
    renderPV();
    fireEvent.click(screen.getByText(PV_NEW_VIEWER_CTA));
    fireEvent.click(
      document.querySelector("[data-action='scrim']") as HTMLElement,
    );
    expect(
      document.querySelector("[data-modal='new-viewer']"),
    ).toBeNull();
  });
});
