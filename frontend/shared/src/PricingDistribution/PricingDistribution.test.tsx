/**
 * PricingDistributionSurface tests (H07 §S3 surface 7).
 *
 * Covers the H07 honesty rules:
 *   • Money is sober — "Connected & active" uses --money, NOT --success
 *   • Stripe Connect "Active" card shows the account email + Disconnect
 *   • "Connect Stripe" CTA fires onConnectStripe (does NOT embed Stripe)
 *   • Watermarking toggle defaults OFF (DRM-free posture)
 *   • Refund policy "custom" reveals the free-text area
 *   • Statutory-rights help line is always visible on the refund section
 *   • Stripe section + price + refund are hidden when model='free'
 *   • No --danger anywhere
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PricingDistributionRecord,
  PricingDistributionSurface,
} from "./index.js";

function makeRecord(
  over: Partial<PricingDistributionRecord> = {},
): PricingDistributionRecord {
  return {
    model: "one-time",
    currency: "USD",
    amount_cents: 1800,
    refund_policy: "standard-14",
    watermark_buyer_email: false,
    stripe_connect: {
      state: "active",
      account_email: "soror.alpha@protonmail.com",
    },
    ...over,
  };
}

describe("PricingDistributionSurface", () => {
  it("renders the topbar title + subtitle", () => {
    render(<PricingDistributionSurface publication={makeRecord()} />);
    expect(screen.getByText("Pricing & distribution")).toBeInTheDocument();
    expect(
      screen.getByText(/What it costs, where the money goes/),
    ).toBeInTheDocument();
  });

  it("renders all four pricing models", () => {
    const { container } = render(
      <PricingDistributionSurface publication={makeRecord()} />,
    );
    expect(
      container.querySelectorAll("[data-pricing-model]"),
    ).toHaveLength(4);
  });

  it("clicking a pricing model fires onChange with the model value", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord()}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-pricing-model='subscribe']",
      ) as HTMLButtonElement,
    );
    expect(onChange).toHaveBeenCalledWith({ model: "subscribe" });
  });

  it("Stripe Connect 'active' card shows the account email + Disconnect", () => {
    const { container, getByText } = render(
      <PricingDistributionSurface publication={makeRecord()} />,
    );
    expect(
      container.querySelector("[data-stripe-state='active']"),
    ).toBeTruthy();
    expect(getByText("soror.alpha@protonmail.com")).toBeInTheDocument();
    expect(getByText("Disconnect")).toBeInTheDocument();
  });

  it("Stripe Connect 'none' state shows the Connect CTA", () => {
    const onConnectStripe = vi.fn();
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord({
          stripe_connect: { state: "none" },
        })}
        onConnectStripe={onConnectStripe}
      />,
    );
    expect(
      container.querySelector("[data-stripe-state='none']"),
    ).toBeTruthy();
    fireEvent.click(
      container.querySelector(
        "[data-action='connect-stripe']",
      ) as HTMLButtonElement,
    );
    expect(onConnectStripe).toHaveBeenCalledTimes(1);
  });

  it("Stripe Connect 'pending' state shows requirements list", () => {
    const { container, getByText } = render(
      <PricingDistributionSurface
        publication={makeRecord({
          stripe_connect: {
            state: "pending",
            requirements: ["business name", "tax id"],
          },
        })}
      />,
    );
    expect(
      container.querySelector("[data-stripe-state='pending']"),
    ).toBeTruthy();
    expect(getByText("business name")).toBeInTheDocument();
    expect(getByText("tax id")).toBeInTheDocument();
  });

  it("Disconnect fires onDisconnectStripe", () => {
    const onDisconnectStripe = vi.fn();
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord()}
        onDisconnectStripe={onDisconnectStripe}
      />,
    );
    fireEvent.click(
      container.querySelector(
        "[data-action='disconnect-stripe']",
      ) as HTMLButtonElement,
    );
    expect(onDisconnectStripe).toHaveBeenCalledTimes(1);
  });

  it("price + refund + Stripe sections are HIDDEN for model='free'", () => {
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord({ model: "free" })}
      />,
    );
    expect(container.querySelector("[data-section='stripe']")).toBeFalsy();
    expect(container.querySelector("[data-section='price']")).toBeFalsy();
    expect(container.querySelector("[data-section='refund']")).toBeFalsy();
  });

  it("amount input parses to cents", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord()}
        onChange={onChange}
      />,
    );
    fireEvent.change(
      container.querySelector("[data-pd-amount]") as HTMLInputElement,
      { target: { value: "24.50" } },
    );
    expect(onChange).toHaveBeenCalledWith({ amount_cents: 2450 });
  });

  it("refund policy 'custom' reveals the free-text textarea", () => {
    const { container, rerender } = render(
      <PricingDistributionSurface publication={makeRecord()} />,
    );
    expect(container.querySelector("[data-pd-refund-text]")).toBeFalsy();
    rerender(
      <PricingDistributionSurface
        publication={makeRecord({ refund_policy: "custom" })}
      />,
    );
    expect(container.querySelector("[data-pd-refund-text]")).toBeTruthy();
  });

  it("refund 'no refunds' is selectable (and statutory-rights help is shown)", () => {
    const onChange = vi.fn();
    const { container, getByText } = render(
      <PricingDistributionSurface
        publication={makeRecord()}
        onChange={onChange}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-refund='none']") as HTMLElement,
    );
    expect(onChange).toHaveBeenCalledWith({ refund_policy: "none" });
    expect(
      getByText(/statutory refund rights/),
    ).toBeInTheDocument();
  });

  it("watermark toggle defaults OFF + flips on click", () => {
    const onChange = vi.fn();
    const { container } = render(
      <PricingDistributionSurface
        publication={makeRecord()}
        onChange={onChange}
      />,
    );
    const toggle = container.querySelector(
      "[data-pd-watermark]",
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ watermark_buyer_email: true });
  });

  it("watermark help copy explicitly says DRM-free", () => {
    const { getByText } = render(
      <PricingDistributionSurface publication={makeRecord()} />,
    );
    expect(getByText(/DRM-free always/)).toBeInTheDocument();
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <PricingDistributionSurface publication={makeRecord()} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
