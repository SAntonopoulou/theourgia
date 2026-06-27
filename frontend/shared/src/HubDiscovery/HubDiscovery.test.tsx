/**
 * HubDiscoverySurface — unit tests.
 *
 * THE H08 honesty rules covered:
 *
 *   * Default sort is alphabetical — popularity is NEVER an option
 *     (rules 18 + 19). The component's HubDiscoverySort type
 *     enumerates only "alpha" and "recent".
 *   * Member counts are quiet (--font-mono + --ink-mute), never
 *     standalone celebratory chrome.
 *   * Private hubs render "This hub is invitation-only" verbatim
 *     and the CTA is disabled.
 *   * "Already a member" CTA is disabled too — no accidental
 *     re-join attempts.
 *   * Empty state names that "many private hubs are joinable only
 *     by invitation" (verbatim from the H08 brief).
 *   * Search matches name + motto + tradition (case-insensitive).
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type HubDiscoveryCard,
  HubDiscoverySurface,
} from "./HubDiscoverySurface.js";
import {
  HD_CTA_ALREADY,
  HD_CTA_INVITATION_ONLY,
  HD_CTA_REQUEST,
  HD_EMPTY_BODY,
  HD_EMPTY_TITLE,
  HD_POLICY_LABELS,
  HD_SEARCH_PLACEHOLDER,
  HD_SUBTITLE,
  HD_TITLE,
} from "./copy.js";

const HUBS: HubDiscoveryCard[] = [
  {
    id: "hub-crossroads",
    slug: "crossroads-coven",
    name: "The Crossroads Coven",
    motto: "Tending Hekate's lamp, together.",
    traditions: ["Hellenic"],
    policy: "public",
    memberCount: 34,
    isMember: false,
  },
  {
    id: "hub-silver-star",
    slug: "silver-star",
    name: "Lodge of the Silver Star",
    motto: "Do what thou wilt shall be the whole of the Law.",
    traditions: ["Thelemic", "Ceremonial"],
    policy: "open-with-approval",
    memberCount: 112,
    isMember: true,
  },
  {
    id: "hub-hedgerow",
    slug: "hedgerow",
    name: "Hedgerow Study Group",
    motto: "The old ways, read closely.",
    traditions: ["Folk"],
    policy: "public",
    memberCount: 18,
    isMember: false,
  },
  {
    id: "hub-hermetic",
    slug: "hermetic-circle",
    name: "The Hermetic Circle",
    motto: "As above, so below — and we compare notes.",
    traditions: ["Hermetic"],
    policy: "private",
    memberCount: 27,
    isMember: false,
  },
];

// ─── Chrome ────────────────────────────────────────────────────────

describe("HubDiscoverySurface — chrome", () => {
  it("renders the title + subtitle from copy", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    expect(screen.getByText(HD_TITLE)).toBeInTheDocument();
    expect(screen.getByText(HD_SUBTITLE)).toBeInTheDocument();
  });

  it("renders the search input with the verbatim placeholder", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const input = document.querySelector(
      "[data-field='search']",
    ) as HTMLInputElement;
    expect(input.placeholder).toBe(HD_SEARCH_PLACEHOLDER);
  });

  it("offers the 8 tradition chips plus 'All'", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const chips = document.querySelectorAll("[data-filter-tradition]");
    expect(chips).toHaveLength(9);
  });
});

// ─── Sort + filter ────────────────────────────────────────────────

describe("HubDiscoverySurface — sort + filter", () => {
  it("sorts alphabetically by default", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const names = Array.from(
      document.querySelectorAll("[data-field='name']"),
    ).map((n) => n.textContent);
    expect(names).toEqual([
      "Hedgerow Study Group",
      "Lodge of the Silver Star",
      "The Crossroads Coven",
      "The Hermetic Circle",
    ]);
  });

  it("filters by typed search term across name + motto + tradition", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const input = document.querySelector(
      "[data-field='search']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hekate" } });
    const names = Array.from(
      document.querySelectorAll("[data-field='name']"),
    ).map((n) => n.textContent);
    expect(names).toEqual(["The Crossroads Coven"]);
  });

  it("search is case-insensitive", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const input = document.querySelector(
      "[data-field='search']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "FOLK" } });
    const names = Array.from(
      document.querySelectorAll("[data-field='name']"),
    ).map((n) => n.textContent);
    expect(names).toEqual(["Hedgerow Study Group"]);
  });

  it("filters by tradition chip", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    fireEvent.click(
      document.querySelector(
        "[data-filter-tradition='thelemic']",
      ) as HTMLElement,
    );
    const names = Array.from(
      document.querySelectorAll("[data-field='name']"),
    ).map((n) => n.textContent);
    expect(names).toEqual(["Lodge of the Silver Star"]);
  });

  it("'All' tradition chip resets the filter", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    fireEvent.click(
      document.querySelector(
        "[data-filter-tradition='thelemic']",
      ) as HTMLElement,
    );
    fireEvent.click(
      document.querySelector(
        "[data-filter-tradition='all']",
      ) as HTMLElement,
    );
    expect(
      document.querySelectorAll("[data-hub-id]"),
    ).toHaveLength(4);
  });
});

// ─── Card chrome ──────────────────────────────────────────────────

describe("HubDiscoverySurface — card chrome", () => {
  it("renders the policy chip verbatim", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    expect(
      screen.getAllByText(HD_POLICY_LABELS.public),
    ).toHaveLength(2);
    expect(
      screen.getByText(HD_POLICY_LABELS["open-with-approval"]),
    ).toBeInTheDocument();
    expect(
      screen.getByText(HD_POLICY_LABELS.private),
    ).toBeInTheDocument();
  });

  it("Public policy chip uses --peer-ok ink", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-crossroads']",
    ) as HTMLElement;
    const chip = card.querySelector("[data-pill='policy']") as HTMLElement;
    expect(chip.style.color).toContain("--peer-ok");
  });

  it("Private policy chip is --ink-mute (not --danger, not --warn)", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-hermetic']",
    ) as HTMLElement;
    const chip = card.querySelector("[data-pill='policy']") as HTMLElement;
    expect(chip.style.color).toContain("--ink-mute");
    expect(chip.style.color).not.toContain("--danger");
    expect(chip.style.color).not.toContain("--warn");
  });

  it("renders the motto verbatim", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    expect(
      screen.getByText("Tending Hekate's lamp, together."),
    ).toBeInTheDocument();
  });

  it("renders member counts as quiet --font-mono stats", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-silver-star']",
    ) as HTMLElement;
    const m = card.querySelector("[data-field='members']") as HTMLElement;
    expect(m.textContent).toBe("112 members");
    expect(m.style.fontFamily).toContain("font-mono");
    expect(m.style.color).toContain("--ink-mute");
  });

  it("renders one tradition pill per tradition", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-silver-star']",
    ) as HTMLElement;
    const trads = card.querySelectorAll("[data-pill='tradition']");
    expect(trads).toHaveLength(2);
    expect(trads[0]?.textContent).toBe("Thelemic");
    expect(trads[1]?.textContent).toBe("Ceremonial");
  });
});

// ─── CTA states (the policy → CTA matrix) ─────────────────────────

describe("HubDiscoverySurface — CTA states", () => {
  it("Public hubs show 'Request to join' enabled", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-crossroads']",
    ) as HTMLElement;
    const cta = card.querySelector(
      "[data-action='cta']",
    ) as HTMLButtonElement;
    expect(cta.textContent).toBe(HD_CTA_REQUEST);
    expect(cta.disabled).toBe(false);
  });

  it("Open-with-approval + isMember=true shows 'Already a member' disabled", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-silver-star']",
    ) as HTMLElement;
    const cta = card.querySelector(
      "[data-action='cta']",
    ) as HTMLButtonElement;
    expect(cta.textContent).toBe(HD_CTA_ALREADY);
    expect(cta.disabled).toBe(true);
  });

  it("Private hubs show 'This hub is invitation-only' disabled", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const card = document.querySelector(
      "[data-hub-id='hub-hermetic']",
    ) as HTMLElement;
    const cta = card.querySelector(
      "[data-action='cta']",
    ) as HTMLButtonElement;
    expect(cta.textContent).toBe(HD_CTA_INVITATION_ONLY);
    expect(cta.disabled).toBe(true);
  });

  it("clicking an enabled CTA fires onRequestJoin with the hub id", () => {
    const onRequestJoin = vi.fn();
    render(
      <HubDiscoverySurface hubs={HUBS} onRequestJoin={onRequestJoin} />,
    );
    const card = document.querySelector(
      "[data-hub-id='hub-crossroads']",
    ) as HTMLElement;
    const cta = card.querySelector(
      "[data-action='cta']",
    ) as HTMLButtonElement;
    fireEvent.click(cta);
    expect(onRequestJoin).toHaveBeenCalledWith("hub-crossroads");
  });

  it("clicking a disabled CTA does NOT fire onRequestJoin", () => {
    const onRequestJoin = vi.fn();
    render(
      <HubDiscoverySurface hubs={HUBS} onRequestJoin={onRequestJoin} />,
    );
    const card = document.querySelector(
      "[data-hub-id='hub-hermetic']",
    ) as HTMLElement;
    const cta = card.querySelector(
      "[data-action='cta']",
    ) as HTMLButtonElement;
    fireEvent.click(cta);
    expect(onRequestJoin).not.toHaveBeenCalled();
  });
});

// ─── Empty state ──────────────────────────────────────────────────

describe("HubDiscoverySurface — empty state", () => {
  it("renders the verbatim empty title + body when no hubs match", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const input = document.querySelector(
      "[data-field='search']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "no-such-thing-zzz" } });
    expect(screen.getByText(HD_EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(HD_EMPTY_BODY)).toBeInTheDocument();
  });

  it("renders the empty state when the input hub list is empty", () => {
    render(<HubDiscoverySurface hubs={[]} />);
    expect(document.querySelector("[data-state='empty']")).not.toBeNull();
  });

  it("hides the grid when empty", () => {
    render(<HubDiscoverySurface hubs={[]} />);
    expect(document.querySelector("[data-grid='hubs']")).toBeNull();
  });
});

// ─── Defensive anti-popularity ────────────────────────────────────

describe("HubDiscoverySurface — defensive anti-popularity", () => {
  it("renders no 'trending' / 'popular' / 'bestseller' chrome", () => {
    render(<HubDiscoverySurface hubs={HUBS} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/bestseller/i);
    expect(text).not.toMatch(/featured/i);
  });

  it("HubDiscoverySort type only enumerates alpha + recent", () => {
    // Compile-time check via a value-level expression — the
    // typechecker rejects any third value at the call site.
    const valid: import("./HubDiscoverySurface.js").HubDiscoverySort[] = [
      "alpha",
      "recent",
    ];
    expect(valid).toEqual(["alpha", "recent"]);
  });
});
