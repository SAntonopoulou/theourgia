/**
 * PublicationsSurface unit tests (H07 §S3 surface 4).
 *
 * Covers the H07 honesty rules:
 *   • Withdrawn cards fade to opacity 0.5 (soft state)
 *   • Live + paid cards show the purchase count as a quiet stat;
 *     drafts / scheduled / free do not
 *   • State chips use --money for live, --info for scheduled,
 *     --ink-mute for drafts and withdrawn; NEVER --danger
 *   • Empty state shows the H07-locked copy + start-new-essay CTA
 *   • Filter chips narrow the grid correctly
 *   • + New publication picker fires onNew with the chosen kind
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type PublicationCardRecord,
  PublicationsSurface,
} from "./index.js";

const FIXTURES: PublicationCardRecord[] = [
  {
    id: "p1",
    title: "Walking the Crossroads",
    author_label: "Soror Ευ. Α.",
    kind: "book",
    state: "live",
    pricing: { model: "one-time", amount_cents: 1800, currency: "USD" },
    purchase_count: 47,
    cited: true,
    cover_url: null,
    created_at: "2026-06-20T00:00:00Z",
  },
  {
    id: "p2",
    title: "On the Sealed Oath",
    author_label: "Soror Ευ. Α.",
    kind: "essay",
    state: "live",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-21T00:00:00Z",
  },
  {
    id: "p3",
    title: "Notes Toward a Theurgy",
    author_label: "Soror Ευ. Α.",
    kind: "essay",
    state: "draft",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-22T00:00:00Z",
  },
  {
    id: "p4",
    title: "The Dark Moon Letters",
    author_label: "Soror Ευ. Α.",
    kind: "post",
    state: "scheduled",
    pricing: { model: "subscribe" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-22T00:00:00Z",
  },
  {
    id: "p5",
    title: "Hours & Their Keeping",
    author_label: "Soror Ευ. Α.",
    kind: "page",
    state: "withdrawn",
    pricing: { model: "free" },
    purchase_count: 0,
    cited: false,
    cover_url: null,
    created_at: "2026-06-15T00:00:00Z",
  },
];

describe("PublicationsSurface", () => {
  it("renders the topbar title + subtitle", () => {
    render(<PublicationsSurface publications={FIXTURES} />);
    expect(screen.getByText("Publications")).toBeInTheDocument();
    expect(screen.getByText(/Books · essays · newsletters/)).toBeInTheDocument();
  });

  it("renders one card per publication", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    expect(container.querySelectorAll("[data-pub-id]")).toHaveLength(5);
  });

  it("withdrawn cards render at opacity 0.5 (soft state, not deleted)", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    const withdrawn = container.querySelector(
      "[data-pub-state='withdrawn']",
    ) as HTMLElement;
    expect(withdrawn.style.opacity).toBe("0.5");
  });

  it("shows purchase count only on live + paid publications", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    const counts = container.querySelectorAll("[data-purchase-count]");
    expect(counts).toHaveLength(1);
    expect(counts[0]?.textContent).toContain("47 purchased");
  });

  it("filter chip 'drafts' narrows to just the draft card", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='drafts']") as HTMLButtonElement,
    );
    const cards = container.querySelectorAll("[data-pub-id]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-pub-id")).toBe("p3");
  });

  it("filter chip 'paid' narrows to paid publications only", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='paid']") as HTMLButtonElement,
    );
    const cards = container.querySelectorAll("[data-pub-id]");
    // p1 (one-time $18) + p4 (subscribe) are paid; p2/p3/p5 are free.
    expect(cards).toHaveLength(2);
  });

  it("filter chip 'books' narrows to books", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    fireEvent.click(
      container.querySelector("[data-filter='books']") as HTMLButtonElement,
    );
    const cards = container.querySelectorAll("[data-pub-id]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.getAttribute("data-pub-id")).toBe("p1");
  });

  it("'+ New publication' menu lists the four kinds in H07 order", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    fireEvent.click(
      container.querySelector("[data-action='open-new']") as HTMLButtonElement,
    );
    const items = container.querySelectorAll("[data-kind]");
    expect(Array.from(items).map((b) => b.getAttribute("data-kind"))).toEqual([
      "book",
      "essay",
      "post",
      "page",
    ]);
  });

  it("picking a kind fires onNew with that kind + closes the menu", () => {
    const onNew = vi.fn();
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} onNew={onNew} />,
    );
    fireEvent.click(
      container.querySelector("[data-action='open-new']") as HTMLButtonElement,
    );
    fireEvent.click(
      container.querySelector("[data-kind='essay']") as HTMLButtonElement,
    );
    expect(onNew).toHaveBeenCalledWith("essay");
    expect(container.querySelector("[data-new-menu]")).toBeFalsy();
  });

  it("click on a card fires onSelect with the publication id", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <PublicationsSurface
        publications={FIXTURES}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(
      container.querySelector("[data-pub-id='p2']") as HTMLButtonElement,
    );
    expect(onSelect).toHaveBeenCalledWith("p2");
  });

  it("empty state renders when publications is empty + start-new fires onNew('essay')", () => {
    const onNew = vi.fn();
    const { container } = render(
      <PublicationsSurface publications={[]} onNew={onNew} />,
    );
    expect(container.querySelector("[data-pubs-empty]")).toBeTruthy();
    expect(
      screen.getByText("No publications yet"),
    ).toBeInTheDocument();
    fireEvent.click(
      container.querySelector("[data-action='empty-start']") as HTMLButtonElement,
    );
    expect(onNew).toHaveBeenCalledWith("essay");
  });

  it("renders the ‡ citation glyph for cited publications only", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    // p1 is cited (it's the only one).
    const cited = container.querySelector("[data-pub-id='p1']") as HTMLElement;
    expect(cited.textContent).toContain("‡");
    const uncited = container.querySelector(
      "[data-pub-id='p2']",
    ) as HTMLElement;
    expect(uncited.textContent).not.toContain("‡");
  });

  it("never references --danger anywhere on the surface", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("price formatting: $18.00 for USD one-time + Free for free + Subscribers for subscribe", () => {
    const { container } = render(
      <PublicationsSurface publications={FIXTURES} />,
    );
    const labels = Array.from(
      container.querySelectorAll("[data-price]"),
    ).map((el) => el.textContent);
    expect(labels).toContain("$18.00");
    expect(labels.filter((l) => l === "Free").length).toBeGreaterThanOrEqual(1);
    expect(labels).toContain("Subscribers");
  });
});
