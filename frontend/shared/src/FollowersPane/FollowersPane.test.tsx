/**
 * FollowersPaneSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * No engagement metrics — the verbatim disclosure renders.
 *   * Decline uses --warn (consequential edit, NEVER --danger).
 *   * Pending count chip uses --warn-soft (action needed, not panic).
 *   * Consent-first: Approve / Decline fire distinct callbacks.
 *   * Empty pending state copy verbatim.
 *   * Handles rendered in --font-mono --remote.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  FollowersPaneSurface,
  type FollowerRow,
  type PendingFollowRow,
} from "./FollowersPaneSurface.js";
import {
  FP_APPROVE_CTA,
  FP_DECLINE_CTA,
  FP_NO_METRICS_NOTE,
  FP_PENDING_CALLOUT,
  FP_PENDING_EMPTY_BODY,
  FP_PENDING_EMPTY_TITLE,
  FP_TAB_FOLLOWERS,
  FP_TAB_PENDING,
  FP_TITLE,
} from "./copy.js";

const FOLLOWERS: FollowerRow[] = [
  {
    id: "f-vesper",
    name: "Lucia Vesper",
    handle: "@lvesper@thelema.example",
    tradition: "Thelemic",
    since: "4 days",
    initial: "L",
    tone: 0,
  },
  {
    id: "f-owl",
    name: "The Owl Library",
    handle: "@owllib@books.bookwyrm.social",
    tradition: "Scholarly",
    since: "2 months",
    initial: "T",
    tone: 1,
  },
];

const PENDING: PendingFollowRow[] = [
  {
    id: "p-orphic",
    name: "orphic.flame",
    handle: "@orphic@pleroma.example",
    initial: "O",
    tone: 2,
  },
  {
    id: "p-sortilege",
    name: "Sortilege Press",
    handle: "@sortilege@writing.exchange",
    initial: "S",
    tone: 3,
  },
];

function renderFp(
  overrides: Partial<
    Parameters<typeof FollowersPaneSurface>[0]
  > = {},
) {
  return render(
    <FollowersPaneSurface
      followers={FOLLOWERS}
      pending={PENDING}
      {...overrides}
    />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("FollowersPaneSurface — chrome", () => {
  it("renders the title (h1)", () => {
    renderFp();
    const h1 = document.querySelector("h1");
    expect(h1?.textContent).toBe(FP_TITLE);
  });

  it("renders the count label as '{N} followers'", () => {
    renderFp();
    expect(
      document.querySelector("[data-field='count-label']")?.textContent,
    ).toBe("2 followers");
  });

  it("singular 'follower' when count is 1", () => {
    renderFp({ followers: [FOLLOWERS[0]!] });
    expect(
      document.querySelector("[data-field='count-label']")?.textContent,
    ).toBe("1 follower");
  });
});

// ─── No-metrics disclosure ───────────────────────────────────────

describe("FollowersPaneSurface — no engagement metrics", () => {
  it("renders the verbatim no-metrics note on the followers tab", () => {
    renderFp();
    expect(
      document
        .querySelector("[data-field='no-metrics-note']")
        ?.textContent?.trim(),
    ).toBe(FP_NO_METRICS_NOTE);
  });

  it("renders no engagement counters per follower (no likes/reposts/views)", () => {
    renderFp();
    // Sanity: each card has name + handle + tradition + since.
    // Nothing else.
    const row = document.querySelector(
      "[data-follower-id='f-vesper']",
    ) as HTMLElement;
    const fields = Array.from(
      row.querySelectorAll("[data-field^='follower-']"),
    ).map((el) => el.getAttribute("data-field"));
    expect(fields).toEqual([
      "follower-name",
      "follower-handle",
      "follower-tradition",
      "follower-since",
    ]);
  });

  it("handle renders in --font-mono --remote", () => {
    renderFp();
    const handle = document.querySelector(
      "[data-follower-id='f-vesper'] [data-field='follower-handle']",
    ) as HTMLElement;
    expect(handle.style.fontFamily).toContain("font-mono");
    expect(handle.style.color).toContain("--remote");
  });
});

// ─── Tabs ────────────────────────────────────────────────────────

describe("FollowersPaneSurface — tabs", () => {
  it("Followers tab is selected by default", () => {
    renderFp();
    expect(
      document
        .querySelector("[data-tab='followers']")
        ?.getAttribute("data-selected"),
    ).toBe("true");
    expect(
      document
        .querySelector("[data-tab='pending']")
        ?.getAttribute("data-selected"),
    ).toBe("false");
  });

  it("clicking Pending switches tabs + reveals the callout", () => {
    renderFp();
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    expect(
      document.querySelector("[data-field='pending-callout']"),
    ).not.toBeNull();
  });

  it("pending count chip uses --warn-soft (action needed, NOT --danger)", () => {
    renderFp();
    const chip = document.querySelector(
      "[data-field='pending-count-chip']",
    ) as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip.textContent).toBe("2");
    expect(chip.style.background).toContain("--warn-soft");
    expect(chip.style.background).not.toContain("--danger");
  });

  it("pending count chip hidden when no pending", () => {
    renderFp({ pending: [] });
    expect(
      document.querySelector("[data-field='pending-count-chip']"),
    ).toBeNull();
  });
});

// ─── Pending tab actions ─────────────────────────────────────────

describe("FollowersPaneSurface — pending actions", () => {
  it("renders the verbatim consent callout", () => {
    renderFp();
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    expect(
      document
        .querySelector("[data-field='pending-callout']")
        ?.textContent?.trim(),
    ).toBe(FP_PENDING_CALLOUT);
  });

  it("Approve fires onApprove with the pending id", () => {
    const onApprove = vi.fn();
    const onDecline = vi.fn();
    renderFp({ onApprove, onDecline });
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    const row = document.querySelector(
      "[data-pending-id='p-orphic']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='approve']") as HTMLElement,
    );
    expect(onApprove).toHaveBeenCalledWith("p-orphic");
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("Decline fires onDecline with the pending id (NOT onApprove)", () => {
    const onApprove = vi.fn();
    const onDecline = vi.fn();
    renderFp({ onApprove, onDecline });
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    const row = document.querySelector(
      "[data-pending-id='p-sortilege']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='decline']") as HTMLElement,
    );
    expect(onDecline).toHaveBeenCalledWith("p-sortilege");
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("Decline CTA uses --warn-soft (NEVER --danger)", () => {
    renderFp();
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    const decline = document.querySelector(
      "[data-action='decline']",
    ) as HTMLElement;
    expect(decline.style.background).toContain("--warn-soft");
    expect(decline.style.background).not.toContain("--danger");
    expect(decline.style.color).not.toContain("--danger");
  });

  it("Approve CTA uses --accent chrome", () => {
    renderFp();
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    const approve = document.querySelector(
      "[data-action='approve']",
    ) as HTMLElement;
    expect(approve.style.background).toContain("--accent");
  });

  it("empty-state copy verbatim when no pending", () => {
    renderFp({ pending: [] });
    fireEvent.click(screen.getByText(FP_TAB_PENDING));
    expect(
      screen.getByText(FP_PENDING_EMPTY_TITLE),
    ).toBeInTheDocument();
    expect(
      screen.getByText(FP_PENDING_EMPTY_BODY),
    ).toBeInTheDocument();
  });
});

// ─── Smoke ────────────────────────────────────────────────────

describe("FollowersPaneSurface — smoke", () => {
  it("renders Followers tab + Pending tab labels", () => {
    renderFp();
    expect(
      document.querySelector("[data-tab='followers']")?.textContent,
    ).toContain(FP_TAB_FOLLOWERS);
    expect(
      document.querySelector("[data-tab='pending']")?.textContent,
    ).toContain(FP_TAB_PENDING);
  });

  it("renders one row per follower", () => {
    renderFp();
    expect(
      document.querySelectorAll("[data-follower-id]"),
    ).toHaveLength(2);
  });

  it("Follower kebab fires onFollowerAction", () => {
    const onFollowerAction = vi.fn();
    renderFp({ onFollowerAction });
    const row = document.querySelector(
      "[data-follower-id='f-owl']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector(
        "[data-action='follower-kebab']",
      ) as HTMLElement,
    );
    expect(onFollowerAction).toHaveBeenCalledWith("f-owl");
  });
});
