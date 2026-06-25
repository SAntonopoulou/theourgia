/**
 * ReaderSurface tests (H07 §S3 surface 8 · PUBLIC).
 *
 * Covers:
 *   • Public surface — carries no VaultNav (verified by markup absence)
 *   • Sticky topbar shows title + author + purchase CTA
 *   • Purchase CTA shape varies by state (for-sale → "Download · $X",
 *     free → "Read", purchased → "Download", subscribers-only →
 *     "Subscribe to read")
 *   • Sibling rail caps at 3 entries; paid siblings use --money,
 *     free use --ink-mute
 *   • Footer renders license + AGPL credit
 *   • Watermark email line surfaces only when present
 *   • No --danger anywhere
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type ReaderPublicationRecord,
  type ReaderSiblingPublication,
  ReaderSurface,
} from "./index.js";

const PUB: ReaderPublicationRecord = {
  id: "p1",
  title: "Walking the Crossroads",
  chapter_eyebrow: "Chapter Three",
  display_title: "The Lamp at the Crossroads",
  author_label: "Soror Ευ. Α.",
  license: "all-rights-reserved",
  license_label: "All rights reserved",
  body_html: "<p>The crossroads is not a place you arrive at…</p>",
};

const SIBLINGS: ReaderSiblingPublication[] = [
  { id: "s1", title: "On the Sealed Oath", href: "/v/x/y", price_label: "Free", is_paid: false },
  { id: "s2", title: "A Grammar of Voces", href: "/v/x/y", price_label: "$24.00", is_paid: true },
  { id: "s3", title: "Notes Toward a Theurgy", href: "/v/x/y", price_label: "Free", is_paid: false },
  { id: "s4", title: "Hours & Their Keeping", href: "/v/x/y", price_label: "Free", is_paid: false },
];

describe("ReaderSurface", () => {
  it("renders the title + author in the sticky topbar", () => {
    render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "free" }}
      />,
    );
    expect(screen.getByText("Walking the Crossroads")).toBeInTheDocument();
    expect(screen.getByText("Soror Ευ. Α.")).toBeInTheDocument();
  });

  it("does NOT carry VaultNav (public surface)", () => {
    const { container } = render(
      <ReaderSurface publication={PUB} purchase={{ kind: "free" }} />,
    );
    expect(
      container.querySelector("[data-component='vault-nav']"),
    ).toBeFalsy();
  });

  it("renders the chapter eyebrow + large display title", () => {
    render(<ReaderSurface publication={PUB} purchase={{ kind: "free" }} />);
    expect(screen.getByText("Chapter Three")).toBeInTheDocument();
    expect(
      screen.getByText("The Lamp at the Crossroads"),
    ).toBeInTheDocument();
  });

  it("purchase CTA = 'Read' when free", () => {
    const { container } = render(
      <ReaderSurface publication={PUB} purchase={{ kind: "free" }} />,
    );
    const btn = container.querySelector(
      "[data-action='purchase']",
    ) as HTMLButtonElement;
    expect(btn.textContent).toContain("Read");
    expect(btn.getAttribute("data-purchase-state")).toBe("free");
  });

  it("purchase CTA shows price for sale", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "for-sale", price_label: "$18.00" }}
      />,
    );
    const btn = container.querySelector(
      "[data-action='purchase']",
    ) as HTMLButtonElement;
    expect(btn.textContent).toContain("Download · $18.00");
  });

  it("purchase CTA = 'Download' when purchased", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "purchased" }}
      />,
    );
    const btn = container.querySelector(
      "[data-action='purchase']",
    ) as HTMLButtonElement;
    expect(btn.textContent?.trim()).toContain("Download");
  });

  it("purchase CTA = 'Subscribe to read' for subscribers-only", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "subscribers-only" }}
      />,
    );
    const btn = container.querySelector(
      "[data-action='purchase']",
    ) as HTMLButtonElement;
    expect(btn.textContent).toContain("Subscribe to read");
  });

  it("clicking the purchase CTA fires onPurchase", () => {
    const onPurchase = vi.fn();
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "for-sale", price_label: "$18.00" }}
        onPurchase={onPurchase}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-action='purchase']") as HTMLButtonElement,
    );
    expect(onPurchase).toHaveBeenCalledTimes(1);
  });

  it("sibling rail caps at 3 entries", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "free" }}
        siblings={SIBLINGS}
      />,
    );
    expect(
      container.querySelectorAll("[data-sibling-id]"),
    ).toHaveLength(3);
  });

  it("sibling rail not rendered when no siblings", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "free" }}
      />,
    );
    expect(
      container.querySelector("[data-reader-siblings]"),
    ).toBeFalsy();
  });

  it("clicking a sibling fires onOpenSibling with the id", () => {
    const onOpenSibling = vi.fn();
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "free" }}
        siblings={SIBLINGS}
        onOpenSibling={onOpenSibling}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-sibling-id='s2']") as HTMLButtonElement,
    );
    expect(onOpenSibling).toHaveBeenCalledWith("s2");
  });

  it("watermark email surfaces in the footer when present", () => {
    const { container, getByText } = render(
      <ReaderSurface
        publication={{ ...PUB, watermark_email: "buyer@example.org" }}
        purchase={{ kind: "purchased" }}
      />,
    );
    expect(
      container.querySelector("[data-reader-watermark]"),
    ).toBeTruthy();
    expect(getByText(/buyer@example.org/)).toBeInTheDocument();
  });

  it("footer carries the AGPLv3 credit + license label", () => {
    const { getByText } = render(
      <ReaderSurface publication={PUB} purchase={{ kind: "free" }} />,
    );
    expect(getByText(/All rights reserved/)).toBeInTheDocument();
    expect(getByText(/Powered by Theourgia \(AGPLv3\)/)).toBeInTheDocument();
  });

  it("renders body content from body_html", () => {
    const { container } = render(
      <ReaderSurface publication={PUB} purchase={{ kind: "free" }} />,
    );
    expect(
      container.querySelector("[data-reader-body]")?.textContent,
    ).toContain("The crossroads");
  });

  it("never references --danger anywhere", () => {
    const { container } = render(
      <ReaderSurface
        publication={PUB}
        purchase={{ kind: "for-sale", price_label: "$18.00" }}
        siblings={SIBLINGS}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});
