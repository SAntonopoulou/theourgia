/**
 * FederatedCommentsSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * Federated comments render handle + `‡ from {instance}`
 *     chip in `--remote`.
 *   * Local comments do NOT render the chip — but layout is
 *     identical otherwise.
 *   * Three sections — Approved (open by default) · Pending
 *     (owner-only) · Hidden (owner-only).
 *   * "Only you can see this" badge appears on owner-only
 *     sections only.
 *   * Hide / Unhide flips with section; Flag is hidden in
 *     Hidden section.
 *   * Empty-state copy verbatim per section.
 *   * No engagement metrics — the only counter is the count chip.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  FederatedCommentsSurface,
  type FedCommentRow,
} from "./FederatedCommentsSurface.js";
import {
  FC_EMPTY_APPROVED,
  FC_EMPTY_PENDING,
  FC_EMPTY_HIDDEN,
  FC_HIDE,
  FC_INTRO,
  FC_OWNER_ONLY,
  FC_SECTION_APPROVED,
  FC_SECTION_HIDDEN,
  FC_SECTION_PENDING,
  FC_UNHIDE,
} from "./copy.js";

const APPROVED: FedCommentRow[] = [
  {
    id: "c-local",
    name: "Theophrastos",
    initial: "T",
    federated: false,
    ts: "2 days ago",
    body: "Local reply.",
  },
  {
    id: "c-remote",
    name: "Frater Lux",
    initial: "F",
    federated: true,
    handle: "@frater-lux@thelema.example",
    instance: "thelema.example",
    ts: "1 day ago",
    body: "Federated reply.",
  },
];

const PENDING: FedCommentRow[] = [
  {
    id: "c-wanderer",
    name: "a wanderer",
    initial: "A",
    federated: true,
    handle: "@wanderer@mas.to",
    instance: "mas.to",
    ts: "5 hours ago",
    body: "Awaiting moderation.",
  },
];

const HIDDEN: FedCommentRow[] = [
  {
    id: "c-spam",
    name: "spam-account",
    initial: "S",
    federated: true,
    handle: "@promo@spam.example",
    instance: "spam.example",
    ts: "3 days ago",
    body: "Spam.",
  },
];

function renderFc(
  overrides: Partial<
    Parameters<typeof FederatedCommentsSurface>[0]
  > = {},
) {
  return render(
    <FederatedCommentsSurface
      publicationTitle="On the Discipline of the Dark Moon"
      approved={APPROVED}
      pending={PENDING}
      hidden={HIDDEN}
      {...overrides}
    />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("FederatedCommentsSurface — chrome", () => {
  it("renders the publication title in smart-quotes", () => {
    renderFc();
    expect(
      document.querySelector("[data-field='publication-title']")
        ?.textContent,
    ).toBe("Comments on “On the Discipline of the Dark Moon”");
  });

  it("renders the verbatim intro paragraph", () => {
    renderFc();
    expect(
      document.querySelector("[data-field='intro']")?.textContent,
    ).toBe(FC_INTRO);
  });

  it("Approved is open by default; others closed", () => {
    renderFc();
    expect(
      document
        .querySelector("[data-section='approved']")
        ?.getAttribute("data-open"),
    ).toBe("true");
    expect(
      document
        .querySelector("[data-section='pending']")
        ?.getAttribute("data-open"),
    ).toBe("false");
    expect(
      document
        .querySelector("[data-section='hidden']")
        ?.getAttribute("data-open"),
    ).toBe("false");
  });

  it("Pending + Hidden carry the 'Only you can see this' badge; Approved does not", () => {
    renderFc();
    expect(
      document.querySelector(
        "[data-section='pending'] [data-field='owner-only-badge']",
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(
        "[data-section='hidden'] [data-field='owner-only-badge']",
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(
        "[data-section='approved'] [data-field='owner-only-badge']",
      ),
    ).toBeNull();
  });

  it("section counts render the comment count", () => {
    renderFc();
    expect(
      document
        .querySelector(
          "[data-section='approved'] [data-field='section-count']",
        )
        ?.textContent,
    ).toBe("2");
    expect(
      document
        .querySelector(
          "[data-section='pending'] [data-field='section-count']",
        )
        ?.textContent,
    ).toBe("1");
  });
});

// ─── Federated marking ────────────────────────────────────────────

describe("FederatedCommentsSurface — federated origin marking", () => {
  it("federated comments render handle + `‡ from {instance}` chip", () => {
    renderFc();
    const c = document.querySelector(
      "[data-comment-id='c-remote']",
    ) as HTMLElement;
    expect(
      c.querySelector("[data-field='comment-handle']")?.textContent,
    ).toBe("@frater-lux@thelema.example");
    const chip = c.querySelector(
      "[data-field='comment-from-chip']",
    ) as HTMLElement;
    expect(chip.textContent).toContain("‡");
    expect(chip.textContent).toContain("from thelema.example");
    expect(chip.style.color).toContain("--remote");
  });

  it("local comments render NO handle and NO chip", () => {
    renderFc();
    const c = document.querySelector(
      "[data-comment-id='c-local']",
    ) as HTMLElement;
    expect(
      c.querySelector("[data-field='comment-handle']"),
    ).toBeNull();
    expect(
      c.querySelector("[data-field='comment-from-chip']"),
    ).toBeNull();
  });

  it("federated handle uses --font-mono --remote", () => {
    renderFc();
    const handle = document.querySelector(
      "[data-comment-id='c-remote'] [data-field='comment-handle']",
    ) as HTMLElement;
    expect(handle.style.fontFamily).toContain("font-mono");
    expect(handle.style.color).toContain("--remote");
  });
});

// ─── Section toggle ─────────────────────────────────────────────

describe("FederatedCommentsSurface — section toggle", () => {
  it("clicking a section header toggles open/closed", () => {
    renderFc();
    fireEvent.click(screen.getByText(FC_SECTION_PENDING));
    expect(
      document
        .querySelector("[data-section='pending']")
        ?.getAttribute("data-open"),
    ).toBe("true");
  });
});

// ─── Hide/Unhide/Flag ───────────────────────────────────────────

describe("FederatedCommentsSurface — moderation actions", () => {
  it("Approved-section comments show 'Hide' (NOT 'Unhide')", () => {
    renderFc();
    const c = document.querySelector(
      "[data-comment-id='c-local']",
    ) as HTMLElement;
    expect(
      c.querySelector("[data-action='hide']")?.textContent,
    ).toBe(FC_HIDE);
    expect(
      c.querySelector("[data-action='unhide']"),
    ).toBeNull();
  });

  it("Hidden-section comments show 'Unhide' (NOT 'Hide')", () => {
    renderFc({
      initialOpen: { approved: false, pending: false, hidden: true },
    });
    const c = document.querySelector(
      "[data-comment-id='c-spam']",
    ) as HTMLElement;
    expect(
      c.querySelector("[data-action='unhide']")?.textContent,
    ).toBe(FC_UNHIDE);
    expect(
      c.querySelector("[data-action='hide']"),
    ).toBeNull();
  });

  it("Hidden-section comments have NO Flag affordance", () => {
    renderFc({
      initialOpen: { approved: false, pending: false, hidden: true },
    });
    const c = document.querySelector(
      "[data-comment-id='c-spam']",
    ) as HTMLElement;
    expect(c.querySelector("[data-action='flag']")).toBeNull();
  });

  it("Approved comments DO have a Flag affordance", () => {
    renderFc();
    const c = document.querySelector(
      "[data-comment-id='c-local']",
    ) as HTMLElement;
    expect(c.querySelector("[data-action='flag']")).not.toBeNull();
  });

  it("Hide fires onHide with id", () => {
    const onHide = vi.fn();
    renderFc({ onHide });
    const c = document.querySelector(
      "[data-comment-id='c-local']",
    ) as HTMLElement;
    fireEvent.click(
      c.querySelector("[data-action='hide']") as HTMLElement,
    );
    expect(onHide).toHaveBeenCalledWith("c-local");
  });
});

// ─── Empty states ──────────────────────────────────────────────

describe("FederatedCommentsSurface — empty states verbatim", () => {
  it("Approved empty state", () => {
    renderFc({ approved: [] });
    expect(
      screen.getByText(FC_EMPTY_APPROVED),
    ).toBeInTheDocument();
  });

  it("Pending empty state", () => {
    renderFc({
      pending: [],
      initialOpen: { approved: false, pending: true, hidden: false },
    });
    expect(
      screen.getByText(FC_EMPTY_PENDING),
    ).toBeInTheDocument();
  });

  it("Hidden empty state", () => {
    renderFc({
      hidden: [],
      initialOpen: { approved: false, pending: false, hidden: true },
    });
    expect(
      screen.getByText(FC_EMPTY_HIDDEN),
    ).toBeInTheDocument();
  });
});

// ─── No engagement metrics ─────────────────────────────────────

describe("FederatedCommentsSurface — no engagement metrics", () => {
  it("no like/repost counters anywhere", () => {
    renderFc();
    expect(
      document.querySelectorAll("[data-field='like-count']"),
    ).toHaveLength(0);
    expect(
      document.querySelectorAll("[data-field='repost-count']"),
    ).toHaveLength(0);
  });
});
