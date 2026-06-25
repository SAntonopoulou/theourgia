/**
 * SubscriptionTiersSurface tests (H07 §S3 surface 9).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type SubscriptionTier,
  SubscriptionTiersSurface,
} from "./index.js";

const TIERS: SubscriptionTier[] = [
  {
    id: "t1",
    name: "Witnesses",
    monthly_cents: 300,
    annual_cents: 3000,
    description: "Early access to every essay.",
    included_labels: ["The Dark Moon Letters"],
    enabled: true,
    display_order: 1,
  },
  {
    id: "t2",
    name: "Patrons",
    monthly_cents: 800,
    annual_cents: 8000,
    description: "Everything in Witnesses, plus appendices.",
    included_labels: ["All Witnesses content"],
    enabled: true,
    display_order: 2,
  },
  {
    id: "t3",
    name: "Stewards",
    monthly_cents: 2000,
    annual_cents: 20000,
    description: "All published work, plus correspondence.",
    included_labels: ["All content"],
    enabled: false,
    display_order: 3,
  },
];

describe("SubscriptionTiersSurface", () => {
  it("renders one card per tier", () => {
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(container.querySelectorAll("[data-tier-id]")).toHaveLength(3);
  });

  it("renders prices in USD format with --money on monthly", () => {
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(
      container.querySelector("[data-tier-monthly='t1']")?.textContent,
    ).toBe("$3");
    expect(
      container.querySelector("[data-tier-annual='t1']")?.textContent,
    ).toBe("$30");
  });

  it("disabled tiers fade to opacity 0.55", () => {
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    const disabled = container.querySelector(
      "[data-tier-id='t3']",
    ) as HTMLElement;
    expect(disabled.style.opacity).toBe("0.55");
  });

  it("tier name edit fires onTierChange", () => {
    const onTierChange = vi.fn();
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
        onTierChange={onTierChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-tier-name='t1']") as HTMLInputElement,
      { target: { value: "New name" } },
    );
    expect(onTierChange).toHaveBeenCalledWith("t1", { name: "New name" });
  });

  it("tier enable toggle fires onTierChange with the new enabled value", () => {
    const onTierChange = vi.fn();
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
        onTierChange={onTierChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-tier-enabled='t3']") as HTMLButtonElement,
    );
    expect(onTierChange).toHaveBeenCalledWith("t3", { enabled: true });
  });

  it("'Add a tier' button fires onAddTier", () => {
    const onAddTier = vi.fn();
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
        onAddTier={onAddTier}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-action='add-tier']") as HTMLButtonElement,
    );
    expect(onAddTier).toHaveBeenCalledTimes(1);
  });

  it("renders the anti-gamification microcopy", () => {
    const { container, getByText } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(
      container.querySelector("[data-anti-gamification]"),
    ).toBeTruthy();
    expect(
      getByText(/Avoid Bronze\/Silver\/Gold gamification language/),
    ).toBeInTheDocument();
  });

  it("shows tier-count warning ONLY when more than 3 tiers", () => {
    const { container, rerender } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(
      container.querySelector("[data-tier-count-warning]"),
    ).toBeFalsy();
    const fourTiers = [
      ...TIERS,
      {
        id: "t4",
        name: "Initiates",
        monthly_cents: 5000,
        annual_cents: 50000,
        description: "An additional tier.",
        included_labels: [],
        enabled: true,
        display_order: 4,
      },
    ];
    rerender(
      <SubscriptionTiersSurface
        tiers={fourTiers}
        paused_new_subscriptions={false}
      />,
    );
    expect(
      container.querySelector("[data-tier-count-warning]"),
    ).toBeTruthy();
  });

  it("pause toggle fires onTogglePaused", () => {
    const onTogglePaused = vi.fn();
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
        onTogglePaused={onTogglePaused}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-pause-toggle]") as HTMLButtonElement,
    );
    expect(onTogglePaused).toHaveBeenCalledTimes(1);
  });

  it("pause toggle reflects paused state via aria-checked", () => {
    const { container, rerender } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(
      container.querySelector("[data-pause-toggle]")?.getAttribute("aria-checked"),
    ).toBe("false");
    rerender(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={true}
      />,
    );
    expect(
      container.querySelector("[data-pause-toggle]")?.getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("orders tiers by display_order", () => {
    const shuffled = [TIERS[2]!, TIERS[0]!, TIERS[1]!];
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={shuffled}
        paused_new_subscriptions={false}
      />,
    );
    const ids = Array.from(
      container.querySelectorAll("[data-tier-id]"),
    ).map((el) => el.getAttribute("data-tier-id"));
    expect(ids).toEqual(["t1", "t2", "t3"]);
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <SubscriptionTiersSurface
        tiers={TIERS}
        paused_new_subscriptions={false}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
