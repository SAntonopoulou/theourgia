/**
 * RegistryReviewDetail — H10 Cluster A6 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  RegistryReviewDetailSurface,
} from "./RegistryReviewDetailSurface.js";
import {
  ACK_COPY,
  type DiffEntry,
  type VerificationCheck,
} from "./copy.js";

const ALL_GREEN: VerificationCheck[] = [
  { key: "signature", label: "Signature verified (Ed25519)", ok: true },
  { key: "license", label: "License SPDX-validated", ok: true },
  { key: "capabilities", label: "Capabilities parsed cleanly", ok: true },
  { key: "extension_points", label: "Extension points recognized", ok: true },
];

const ONE_RED: VerificationCheck[] = [
  { key: "signature", label: "Signature verified (Ed25519)", ok: true },
  { key: "license", label: "License SPDX-validated", ok: false },
  { key: "capabilities", label: "Capabilities parsed cleanly", ok: true },
  { key: "extension_points", label: "Extension points recognized", ok: true },
];

const DIFF_WITH_ADDED: DiffEntry[] = [
  {
    kind: "added",
    label: "Make outbound network requests",
    wireKey: "network.outbound",
    consequence:
      "New in this version — fetches updated seals from the author's server.",
  },
  {
    kind: "unchanged",
    label: "Read your magical beings",
    wireKey: "read.entities",
  },
];

const MANIFEST = `[plugin]\nname = "x"\nversion = "1.0.0"`;

describe("RegistryReviewDetailSurface", () => {
  test("ACK_COPY is verbatim from H10 rule 44", () => {
    expect(ACK_COPY).toBe(
      "I have reviewed the source code, the migration history, the capability declarations, and the test coverage. This plugin meets the Official-tier bar.",
    );
  });

  test("rule 44 — verification panel renders every check (read-only)", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    expect(
      screen.getByText("Signature verified (Ed25519)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("License SPDX-validated"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Capabilities parsed cleanly"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Extension points recognized"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Read-only — a failing check cannot be bypassed/i),
    ).toBeInTheDocument();
  });

  test("rule 44 — first submission renders 'Full review required' note", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        // No diffAgainstVersion → first submission.
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    expect(
      screen.getByText(/First submission — full review required\./i),
    ).toBeInTheDocument();
  });

  test("added-capability rows render --warn-soft chrome with '+ added'", () => {
    const { container } = render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    expect(screen.getByText("+ added")).toBeInTheDocument();
    expect(
      screen.getByText("Make outbound network requests"),
    ).toBeInTheDocument();
    expect(screen.getByText("network.outbound")).toBeInTheDocument();

    const addedRow = container.querySelector('[data-kind="added"]');
    const styles = addedRow?.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
  });

  test("rule 44 — Accept-as-Official is DISABLED when checks fail", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ONE_RED}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    expect(screen.getByText("Accept as Official")).toBeDisabled();
    expect(screen.getByText("Accept as Community")).toBeDisabled();
    expect(screen.getByText("Request changes")).toBeDisabled();
  });

  test("rule 44 — Accept-as-Official requires ack checkbox even when all green", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    // Before ack: Community + Request changes are enabled; Official is NOT.
    expect(screen.getByText("Accept as Community")).toBeEnabled();
    expect(screen.getByText("Request changes")).toBeEnabled();
    expect(screen.getByText("Accept as Official")).toBeDisabled();

    // Tick the ack checkbox.
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Accept as Official")).toBeEnabled();
  });

  test("rule 44 — Accept-as-Official stays disabled on first submission even when acked", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        // No diffAgainstVersion — first submission.
        diff={[]}
        manifestText={MANIFEST}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("Accept as Official")).toBeDisabled();
  });

  test("Accept-as-Community fires onAcceptCommunity with current notes", () => {
    const onAcceptCommunity = vi.fn();
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
        onAcceptCommunity={onAcceptCommunity}
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Reviewer notes"),
      { target: { value: "This looks clean to me — fast-track" } },
    );
    fireEvent.click(screen.getByText("Accept as Community"));
    expect(onAcceptCommunity).toHaveBeenCalledWith(
      "This looks clean to me — fast-track",
    );
  });

  test("Request changes fires with the current notes too", () => {
    const onRequestChanges = vi.fn();
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
        onRequestChanges={onRequestChanges}
      />,
    );
    fireEvent.change(
      screen.getByLabelText("Reviewer notes"),
      { target: { value: "Please reconcile the citation" } },
    );
    fireEvent.click(screen.getByText("Request changes"));
    expect(onRequestChanges).toHaveBeenCalledWith(
      "Please reconcile the citation",
    );
  });

  test("manifest preview text renders verbatim in a pre block", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
      />,
    );
    expect(screen.getByText(/name = "x"/)).toBeInTheDocument();
  });

  test("source-download link uses the override href + label", () => {
    render(
      <RegistryReviewDetailSurface
        checks={ALL_GREEN}
        diffAgainstVersion="v2.2.0"
        diff={DIFF_WITH_ADDED}
        manifestText={MANIFEST}
        sourceLabel="Download source from PyPI →"
        sourceHref="https://pypi.org/project/x/1.0.0/"
      />,
    );
    const link = screen.getByText(/Download source from PyPI/i)
      .closest("a");
    expect(link).toHaveAttribute(
      "href",
      "https://pypi.org/project/x/1.0.0/",
    );
  });
});
