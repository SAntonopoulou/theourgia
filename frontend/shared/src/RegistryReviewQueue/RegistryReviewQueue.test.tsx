/**
 * RegistryReviewQueue — H10 Cluster A5 tests.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
  RegistryReviewQueueSurface,
  type ReviewQueueRow,
} from "./RegistryReviewQueueSurface.js";
import { countLabel } from "./copy.js";

const ROWS: ReviewQueueRow[] = [
  {
    id: "q1",
    name: "Hekatean Epithets",
    version: "v1.1.0",
    authorHandle: "@trioditis",
    submittedAt: "8 days ago",
    targetTier: "community",
    capabilityCount: 2,
    manifestParses: true,
  },
  {
    id: "q2",
    name: "Goetic Hierarchy",
    version: "v2.3.0",
    authorHandle: "@solomon",
    submittedAt: "5 days ago",
    targetTier: "official",
    capabilityCount: 4,
    manifestParses: true,
  },
  {
    id: "q3",
    name: "Coptic Calendar",
    version: "v1.2.0",
    authorHandle: "@wabt",
    submittedAt: "3 days ago",
    targetTier: "community",
    capabilityCount: 2,
    manifestParses: false,
  },
];

describe("RegistryReviewQueueSurface", () => {
  test("count label renders verbatim from row count", () => {
    expect(countLabel(0)).toBe("0 submissions pending");
    expect(countLabel(1)).toBe("1 submission pending");
    expect(countLabel(5)).toBe("5 submissions pending");
  });

  test("rule 38 — FIFO note renders verbatim", () => {
    render(<RegistryReviewQueueSurface rows={ROWS} />);
    expect(
      screen.getByText(/Oldest first — clear the queue in order/i),
    ).toBeInTheDocument();
  });

  test("rule 38 — NO popularity / trending / featured language anywhere", () => {
    const { container } = render(
      <RegistryReviewQueueSurface rows={ROWS} />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("popular");
    expect(html).not.toContain("trending");
    expect(html).not.toContain("featured");
  });

  test("renders all queue rows with name + version + author + date", () => {
    render(<RegistryReviewQueueSurface rows={ROWS} />);
    expect(screen.getByText("Hekatean Epithets")).toBeInTheDocument();
    expect(screen.getByText("@solomon")).toBeInTheDocument();
    expect(screen.getByText("3 days ago")).toBeInTheDocument();
  });

  test("manifest-error rows render the --warn-soft 'manifest error' chip", () => {
    render(<RegistryReviewQueueSurface rows={ROWS} />);
    expect(screen.getByText("manifest error")).toBeInTheDocument();
    expect(screen.getAllByText("manifest parses").length).toBe(2);
  });

  test("tier chip distinguishes Community vs Official with neutral chrome", () => {
    render(<RegistryReviewQueueSurface rows={ROWS} />);
    // "→ Community" and "→ Official" both render.
    expect(screen.getAllByText("→ Community").length).toBe(2);
    expect(screen.getByText("→ Official")).toBeInTheDocument();
  });

  test("Start review CTA fires onStartReview with row id", () => {
    const onStartReview = vi.fn();
    render(
      <RegistryReviewQueueSurface
        rows={ROWS}
        onStartReview={onStartReview}
      />,
    );
    const btns = screen.getAllByText("Start review");
    fireEvent.click(btns[1]!);
    expect(onStartReview).toHaveBeenCalledWith("q2");
  });

  test("filters fire callbacks", () => {
    const onTier = vi.fn();
    const onRange = vi.fn();
    render(
      <RegistryReviewQueueSurface
        rows={ROWS}
        onTargetTierChange={onTier}
        onTimeRangeChange={onRange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Target tier filter"), {
      target: { value: "official" },
    });
    expect(onTier).toHaveBeenCalledWith("official");
    fireEvent.change(screen.getByLabelText("Time range filter"), {
      target: { value: "last_7_days" },
    });
    expect(onRange).toHaveBeenCalledWith("last_7_days");
  });

  test("calm empty-state when queue is clear", () => {
    render(<RegistryReviewQueueSurface rows={[]} />);
    expect(
      screen.getByText(/No pending submissions\. Queue is clear\./i),
    ).toBeInTheDocument();
  });
});
