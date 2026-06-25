/**
 * SubscribersSurface tests (H07 §S3 surface 10).
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type SubscriberRow,
  SubscribersSurface,
  type SubscribersStats,
} from "./index.js";

const STATS: SubscribersStats = {
  active_count: 38,
  monthly_recurring_revenue_cents: 21400,
  lifetime_revenue_cents: 294000,
  churn_30d_percent: 2.1,
};

const ROWS: SubscriberRow[] = [
  {
    id: "s1",
    identity_label: "Frater A.O.",
    tier_label: "Patrons",
    active_since: "14 Jan 2026",
    status: "active",
    is_test: false,
  },
  {
    id: "s2",
    identity_label: "soror.nyx@…",
    tier_label: "Witnesses",
    active_since: "02 Feb 2026",
    status: "active",
    is_test: false,
  },
  {
    id: "s3",
    identity_label: "k.hermes@…",
    tier_label: "Witnesses",
    active_since: "30 Mar 2026",
    status: "paused",
    is_test: false,
  },
  {
    id: "s4",
    identity_label: "thalassa@…",
    tier_label: "Patrons",
    active_since: "11 Dec 2025",
    status: "failed",
    is_test: false,
  },
  {
    id: "s5",
    identity_label: "Frater V.",
    tier_label: "Witnesses",
    active_since: "08 Oct 2025",
    status: "cancelled",
    is_test: false,
  },
];

describe("SubscribersSurface", () => {
  it("renders the four quiet stats", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    expect(container.querySelectorAll("[data-stat]")).toHaveLength(4);
    expect(
      container.querySelector("[data-stat='active_count']")?.textContent,
    ).toContain("38");
    expect(
      container.querySelector("[data-stat='mrr']")?.textContent,
    ).toContain("$214");
    expect(
      container.querySelector("[data-stat='lifetime']")?.textContent,
    ).toContain("$2,940");
    expect(
      container.querySelector("[data-stat='churn']")?.textContent,
    ).toContain("2.1%");
  });

  it("renders one row per subscriber", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    expect(
      container.querySelectorAll("[data-subscriber-id]"),
    ).toHaveLength(5);
  });

  it("active subscribers carry the --money status chip", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    const chip = container.querySelector(
      "[data-status-chip='active']",
    ) as HTMLElement;
    expect(chip.textContent).toContain("Active");
    expect(chip.style.color).toContain("var(--money)");
  });

  it("failed-payment subscribers use --warn (NEVER --danger)", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    const chip = container.querySelector(
      "[data-status-chip='failed']",
    ) as HTMLElement;
    expect(chip.style.color).toContain("var(--warn)");
    expect(chip.style.color).not.toContain("var(--danger)");
  });

  it("filter chips narrow the table", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='failed']") as HTMLButtonElement,
    );
    const rows = container.querySelectorAll("[data-subscriber-id]");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute("data-subscriber-id")).toBe("s4");
  });

  it("kebab menu opens + closes", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    expect(container.querySelector("[data-row-menu]")).toBeFalsy();
    fireEvent.click(
      container.querySelector("[data-row-kebab='s1']") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-row-menu]")).toBeTruthy();
    fireEvent.click(
      container.querySelector("[data-row-kebab='s1']") as HTMLButtonElement,
    );
    expect(container.querySelector("[data-row-menu]")).toBeFalsy();
  });

  it("kebab actions fire onRowAction with the row id + action", () => {
    const onRowAction = vi.fn();
    const { container } = render(
      <SubscribersSurface
        stats={STATS}
        subscribers={ROWS}
        onRowAction={onRowAction}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-row-kebab='s1']") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector(
        "[data-row-action='refund']",
      ) as HTMLButtonElement,
    );
    expect(onRowAction).toHaveBeenCalledWith("s1", "refund");
  });

  it("refund action label says 'Stripe portal' (never inline)", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    fireEvent.click(
      container.querySelector("[data-row-kebab='s1']") as HTMLButtonElement,
    );
    const refundBtn = container.querySelector(
      "[data-row-action='refund']",
    ) as HTMLButtonElement;
    expect(refundBtn.textContent).toMatch(/Stripe portal/i);
  });

  it("footer carries the Stripe-data-residency `‡` note", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    expect(
      container.querySelector("[data-subscribers-footer-note]")?.textContent,
    ).toContain("Subscriber data is in your Stripe account");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <SubscribersSurface stats={STATS} subscribers={ROWS} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
