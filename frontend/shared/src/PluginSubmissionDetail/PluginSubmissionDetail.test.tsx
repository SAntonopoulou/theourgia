/**
 * PluginSubmissionDetail — H10 Cluster A4 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { PluginSubmissionDetailSurface } from "./PluginSubmissionDetailSurface.js";
import type { TimelineEntry } from "./copy.js";

const TIMELINE: TimelineEntry[] = [
  {
    label: "Changes requested by @sophia",
    meta: "4 days ago · maintainer",
    tone: "warn",
  },
  {
    label: "Under review by @sophia",
    meta: "5 days ago · maintainer",
    tone: "accent",
  },
  {
    label: "Submitted",
    meta: "6 days ago · you",
    tone: "ink-mute",
  },
];

const CAPS = [
  { label: "Read your magical beings", wireKey: "read.entities" },
  { label: "Apply database migrations", wireKey: "db.migrations" },
];

describe("PluginSubmissionDetailSurface", () => {
  test("renders the timeline entries with their human-readable labels", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    expect(
      screen.getByText("Changes requested by @sophia"),
    ).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText(/today · you|6 days ago · you/i))
      .toBeInTheDocument();
  });

  test("rule 49 — timeline meta uses human labels, NO UUIDs", () => {
    const { container } = render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    // No UUID-shaped substring present
    expect(container.textContent).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  test("changes-requested state renders the reviewer-note block ABOVE timeline", () => {
    const { container } = render(
      <PluginSubmissionDetailSurface
        reviewerNote={{
          body:
            "The Picatrix image cites the Warburg edition but the text matches Atallah. Please reconcile.",
          maintainerLabel: "maintainer: @sophia",
        }}
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    expect(
      screen.getByText(/What needs to change before this can be accepted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Picatrix image cites the Warburg edition/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/maintainer: @sophia/i)).toBeInTheDocument();

    // The reviewer-note section is the first <section> child.
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]!.textContent).toContain(
      "What needs to change",
    );
  });

  test("Resubmit CTA fires onResubmit callback when provided", () => {
    const onResubmit = vi.fn();
    render(
      <PluginSubmissionDetailSurface
        reviewerNote={{ body: "x" }}
        timeline={TIMELINE}
        capabilities={CAPS}
        onResubmit={onResubmit}
      />,
    );
    fireEvent.click(
      screen.getByText(/Resubmit with changes/i),
    );
    expect(onResubmit).toHaveBeenCalledTimes(1);
  });

  test("Withdraw button hidden when canWithdraw=false", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
        canWithdraw={false}
      />,
    );
    expect(screen.queryByText(/Withdraw submission/i)).toBeNull();
    expect(
      screen.queryByText(/Withdrawing tombstones this submission/i),
    ).toBeNull();
  });

  test("Withdraw button fires onWithdraw + uses --warn-soft (rule 2)", () => {
    const onWithdraw = vi.fn();
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
        onWithdraw={onWithdraw}
      />,
    );
    const btn = screen.getByText(/Withdraw submission/i);
    fireEvent.click(btn);
    expect(onWithdraw).toHaveBeenCalledTimes(1);

    const styles = btn.getAttribute("style") ?? "";
    expect(styles).toContain("var(--warn-soft)");
    expect(styles).not.toContain("--danger");
  });

  test("Withdraw hint copy renders verbatim", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    expect(
      screen.getByText(
        /Withdrawing tombstones this submission\. Existing installs keep working\./i,
      ),
    ).toBeInTheDocument();
  });

  test("renders capability chips with wire keys", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    expect(screen.getByText("Read your magical beings")).toBeInTheDocument();
    expect(screen.getByText("read.entities")).toBeInTheDocument();
    expect(screen.getByText("db.migrations")).toBeInTheDocument();
  });

  test("renders capability hint when provided", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
        capabilityHint="Unchanged since v1.4.2."
      />,
    );
    expect(
      screen.getByText("Unchanged since v1.4.2."),
    ).toBeInTheDocument();
  });

  test("no reviewer-note: the warn-soft block is absent", () => {
    render(
      <PluginSubmissionDetailSurface
        timeline={TIMELINE}
        capabilities={CAPS}
      />,
    );
    expect(
      screen.queryByText(/What needs to change before this can be accepted/i),
    ).toBeNull();
  });
});
