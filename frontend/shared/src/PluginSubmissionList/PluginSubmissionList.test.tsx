/**
 * PluginSubmissionList — H10 Cluster A3 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  PluginSubmissionListSurface,
  type SubmissionRow,
} from "./PluginSubmissionListSurface.js";

const ROWS: SubmissionRow[] = [
  {
    id: "r1",
    name: "Geomancy Workbench",
    version: "v2.2.0",
    submittedAt: "today",
    state: "under_review",
  },
  {
    id: "r2",
    name: "Decanic Faces",
    version: "v1.5.0",
    submittedAt: "4 days ago",
    state: "changes_requested",
    noteCount: 2,
  },
  {
    id: "r3",
    name: "Geomancy Workbench",
    version: "v2.0.0",
    submittedAt: "6 weeks ago",
    state: "accepted_official",
    noteCount: 3,
  },
  {
    id: "r4",
    name: "Quick Sigil Stub",
    version: "v0.1.0",
    submittedAt: "3 months ago",
    state: "rejected",
  },
  {
    id: "r5",
    name: "Old Tarot Spread Pack",
    version: "v0.4.0",
    submittedAt: "5 months ago",
    state: "withdrawn",
  },
];

describe("PluginSubmissionListSurface", () => {
  test("renders the preamble verbatim (rule 40 record-keeping)", () => {
    render(<PluginSubmissionListSurface rows={ROWS} />);
    expect(
      screen.getByText(/Submissions are never removed from this list/i),
    ).toBeInTheDocument();
  });

  test("renders every state chip in the row set", () => {
    render(<PluginSubmissionListSurface rows={ROWS} />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(screen.getByText("Accepted (Official)")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
  });

  test("note count rendered as '{n} notes' only when > 0", () => {
    render(<PluginSubmissionListSurface rows={ROWS} />);
    expect(screen.getByText("2 notes")).toBeInTheDocument();
    expect(screen.getByText("3 notes")).toBeInTheDocument();
    // Row r1 has no noteCount — "0 notes" should not appear
    expect(screen.queryByText("0 notes")).toBeNull();
  });

  test("onOpen fires with the row id when a row is clicked", () => {
    const onOpen = vi.fn();
    render(
      <PluginSubmissionListSurface rows={ROWS} onOpen={onOpen} />,
    );
    fireEvent.click(screen.getByText("Decanic Faces"));
    expect(onOpen).toHaveBeenCalledWith("r2");
  });

  test("rule 41 — NO 'promote to Official' affordance anywhere", () => {
    const { container } = render(
      <PluginSubmissionListSurface rows={ROWS} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("promote to official");
    expect(html).not.toContain("self-promote");
    expect(html).not.toContain("upgrade tier");
  });

  test("calm empty state when there are no submissions yet", () => {
    render(<PluginSubmissionListSurface rows={[]} />);
    expect(
      screen.getByText(/No submissions yet/i),
    ).toBeInTheDocument();
  });

  test("rule 40 — rejected/withdrawn rows stay in the list (no delete UI)", () => {
    render(<PluginSubmissionListSurface rows={ROWS} />);
    expect(screen.getByText("Quick Sigil Stub")).toBeInTheDocument();
    expect(screen.getByText("Old Tarot Spread Pack")).toBeInTheDocument();
    // No "delete" button anywhere
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  test("accepted_official row has a peer-ok dot indicator before the chip text", () => {
    render(<PluginSubmissionListSurface rows={ROWS} />);
    const chip = screen.getByText("Accepted (Official)");
    // The dot is a sibling <span> inside the chip wrapper.
    expect(chip.parentElement?.querySelector("span")).not.toBeNull();
  });

  test("withdrawn row carries the ‡ tombstone glyph", () => {
    const { container } = render(
      <PluginSubmissionListSurface rows={ROWS} />,
    );
    // The withdrawn chip contains a ‡ glyph before the label.
    const withdrawnRow = container.querySelector('[data-state="withdrawn"]');
    expect(withdrawnRow?.textContent).toContain("‡");
  });
});
