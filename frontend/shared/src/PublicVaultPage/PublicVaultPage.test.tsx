/**
 * PublicVaultPageSurface tests (H07 §S3 surface 12 · PUBLIC).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PublicVaultNewsletterIssue,
  type PublicVaultPageRecord,
  type PublicVaultPublication,
  type PublicVaultTier,
  PublicVaultPageSurface,
} from "./index.js";

const VAULT: PublicVaultPageRecord = {
  display_name: "Soror Ευ. Α.",
  pronouns: "she · her",
  bio: "A theurgist of the Hellenic tradition.",
  links: [
    { label: "website", href: "https://example.com" },
    { label: "mastodon", href: "https://mastodon.social/@s" },
  ],
  license_label: "CC-BY-NC 4.0",
  popular_sort_opt_in: false,
};

const PUBS: PublicVaultPublication[] = [
  {
    id: "p1",
    title: "Walking the Crossroads",
    href: "/v/x/walking",
    price_label: "$18.00",
    is_paid: true,
    cited: true,
    published_at: "2026-05-12T00:00:00Z",
  },
  {
    id: "p2",
    title: "On the Sealed Oath",
    href: "/v/x/oath",
    price_label: "Free",
    is_paid: false,
    cited: false,
    published_at: "2026-04-01T00:00:00Z",
  },
];

const NEWSLETTER = {
  title: "The Dark Moon Letters",
  description: "A letter each dark moon.",
  recent_issues: [
    { id: "i1", title: "What the dark moon asked", date_label: "15 May 2026" },
    { id: "i2", title: "On giving unseen", date_label: "17 Apr 2026" },
  ] as readonly PublicVaultNewsletterIssue[],
};

const TIERS: PublicVaultTier[] = [
  {
    id: "t1",
    name: "Witnesses",
    monthly_label: "$3",
    description: "Early access.",
    is_primary: false,
    subscribe_href: "/checkout?tier=t1",
  },
  {
    id: "t2",
    name: "Patrons",
    monthly_label: "$8",
    description: "Everything in Witnesses plus appendices.",
    is_primary: true,
    subscribe_href: "/checkout?tier=t2",
  },
];

describe("PublicVaultPageSurface", () => {
  it("renders the hero with display name + pronouns + bio + links", () => {
    render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    expect(screen.getByText("Soror Ευ. Α.")).toBeInTheDocument();
    expect(screen.getByText("she · her")).toBeInTheDocument();
    expect(
      screen.getByText(/theurgist of the Hellenic tradition/),
    ).toBeInTheDocument();
    expect(screen.getByText(/website/)).toBeInTheDocument();
    expect(screen.getByText(/mastodon/)).toBeInTheDocument();
  });

  it("does NOT carry VaultNav (public surface)", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    expect(
      container.querySelector("[data-component='vault-nav']"),
    ).toBeFalsy();
  });

  it("Publications tab shows the cards", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    expect(container.querySelectorAll("[data-pub-id]")).toHaveLength(2);
  });

  it("'Popular' sort is HIDDEN when popular_sort_opt_in is false", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    const select = container.querySelector(
      "[data-publications-sort]",
    ) as HTMLSelectElement;
    const optValues = Array.from(select.options).map((o) => o.value);
    expect(optValues).toContain("newest");
    expect(optValues).toContain("oldest");
    expect(optValues).not.toContain("popular");
  });

  it("'Popular' sort is SHOWN when popular_sort_opt_in is true", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={{ ...VAULT, popular_sort_opt_in: true }}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    const select = container.querySelector(
      "[data-publications-sort]",
    ) as HTMLSelectElement;
    const optValues = Array.from(select.options).map((o) => o.value);
    expect(optValues).toContain("popular");
  });

  it("Newsletter tab signup shows the double-opt-in disclaimer", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    fireEvent.click(container.querySelector("[data-tab='newsletter']") as HTMLButtonElement);
    const disclaimer = container.querySelector(
      "[data-double-opt-in-disclaimer]",
    );
    expect(disclaimer).toBeTruthy();
    expect(disclaimer?.textContent).toContain("check your email to confirm");
    expect(disclaimer?.textContent).toContain("you're not subscribed");
  });

  it("Newsletter signup acknowledged with confirm-pending state on submit", () => {
    const onNewsletterSignup = vi.fn();
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
        onNewsletterSignup={onNewsletterSignup}
      />,
    );
    fireEvent.click(container.querySelector("[data-tab='newsletter']") as HTMLButtonElement);
    fireEvent.change(
      container.querySelector("[data-signup-email]") as HTMLInputElement,
      { target: { value: "test@example.com" } },
    );
    fireEvent.click(
      container.querySelector("[data-signup-submit]") as HTMLButtonElement,
    );
    expect(onNewsletterSignup).toHaveBeenCalledWith("test@example.com");
    expect(
      container.querySelector("[data-signup-acknowledged]"),
    ).toBeTruthy();
  });

  it("Support tab renders tier cards + Subscribe links", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    fireEvent.click(container.querySelector("[data-tab='support']") as HTMLButtonElement);
    expect(container.querySelectorAll("[data-tier-id]")).toHaveLength(2);
    const t2Subscribe = container.querySelector(
      "[data-subscribe-href='t2']",
    ) as HTMLAnchorElement;
    expect(t2Subscribe.getAttribute("href")).toBe("/checkout?tier=t2");
  });

  it("Footer renders license + AGPLv3 credit", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    const footer = container.querySelector(
      "[data-vault-footer]",
    ) as HTMLElement;
    expect(footer.textContent).toContain("AGPLv3");
    expect(footer.textContent).toContain("CC-BY-NC 4.0");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <PublicVaultPageSurface
        vault={VAULT}
        publications={PUBS}
        newsletter={NEWSLETTER}
        tiers={TIERS}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
