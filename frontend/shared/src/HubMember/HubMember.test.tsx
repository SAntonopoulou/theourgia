/**
 * HubMemberDashboardSurface — unit tests.
 *
 * THE H08 honesty rules covered:
 *
 *   * Feed is chronological — items render in caller order
 *     within each day; days render in caller order.
 *   * No inline reactions on feed cards (no like/boost/view
 *     buttons; defensive search for ☆ ♥ etc.).
 *   * Every submission row carries Withdraw — even already-
 *     withdrawn rows (idempotent re-attempts permitted).
 *   * Withdraw disclosure is verbatim.
 *   * Sharing toggles default OFF when sharingState omits them.
 *   * Status pills NEVER use --danger.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type HubFeedDay,
  HubMemberDashboardSurface,
  type HubMySubmission,
} from "./HubMemberDashboardSurface.js";
import {
  HM_NEWSLETTER_CTA,
  HM_SHARING_HEADER,
  HM_SHARING_TOGGLES,
  HM_STATUS_LABELS,
  HM_TAB_LABELS,
  HM_WITHDRAW_DISCLOSURE,
  HM_WITHDRAW_LABEL,
} from "./copy.js";

const FEED_DAYS: HubFeedDay[] = [
  {
    label: "Today",
    items: [
      {
        id: "f-1",
        did: "did:theourgia:terra.example:diotima",
        kind: "working",
        time: "2h ago",
        preview:
          "Pushed: a dark-moon Deipnon at the shared stone. The lamp held all night.",
      },
      {
        id: "f-2",
        did: "did:theourgia:aurora.example:soror-aurora",
        kind: "divination",
        time: "5h ago",
        preview: "Pushed: a three-card draw on the hub's spring working.",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        id: "f-3",
        did: "did:theourgia:hearth.sophia.example:frater-h",
        kind: "publication",
        time: "18:40",
        preview:
          "Pushed: notes toward a shared egregore — for the hub library.",
      },
    ],
  },
];

const SUBMISSIONS: HubMySubmission[] = [
  { id: "s-1", title: "Dark-moon Deipnon", submitted: "2h ago", status: "pending" },
  {
    id: "s-2",
    title: "On the Ephesia Grammata",
    submitted: "3 days ago",
    status: "approved",
  },
  {
    id: "s-3",
    title: "A draft, reconsidered",
    submitted: "a week ago",
    status: "sent-back",
  },
  {
    id: "s-4",
    title: "An old working",
    submitted: "2 weeks ago",
    status: "withdrawn",
  },
];

function renderHM(
  overrides: Partial<
    Parameters<typeof HubMemberDashboardSurface>[0]
  > = {},
) {
  return render(
    <HubMemberDashboardSurface
      hubName="The Crossroads Coven"
      monogram="Κ"
      tradition="Hellenic"
      role="officer"
      feedDays={FEED_DAYS}
      submissions={SUBMISSIONS}
      sharingState={{}}
      {...overrides}
    />,
  );
}

// ─── Tabs + topbar ────────────────────────────────────────────────

describe("HubMemberDashboardSurface — chrome", () => {
  it("renders all three tabs verbatim", () => {
    renderHM();
    expect(screen.getByText(HM_TAB_LABELS.feed)).toBeInTheDocument();
    expect(screen.getByText(HM_TAB_LABELS.subs)).toBeInTheDocument();
    expect(screen.getByText(HM_TAB_LABELS.sharing)).toBeInTheDocument();
  });

  it("defaults to the Feed tab", () => {
    renderHM();
    expect(
      document.querySelector("[data-tab-panel='feed']"),
    ).not.toBeNull();
  });

  it("renders the hub name + 'tradition · you're a/an {role}'", () => {
    renderHM({ role: "officer" });
    expect(screen.getByText("The Crossroads Coven")).toBeInTheDocument();
    const meta = document.querySelector(
      "[data-field='meta']",
    ) as HTMLElement;
    expect(meta.textContent).toBe("Hellenic · you're an officer");
  });

  it("uses 'you're a' for consonant-initial roles", () => {
    renderHM({ role: "member" });
    const meta = document.querySelector(
      "[data-field='meta']",
    ) as HTMLElement;
    expect(meta.textContent).toBe("Hellenic · you're a member");
  });

  it("renders the Newsletter topbar CTA and fires onOpenNewsletter", () => {
    const onOpenNewsletter = vi.fn();
    renderHM({ onOpenNewsletter });
    fireEvent.click(screen.getByText(HM_NEWSLETTER_CTA));
    expect(onOpenNewsletter).toHaveBeenCalledTimes(1);
  });
});

// ─── Feed tab ─────────────────────────────────────────────────────

describe("HubMemberDashboardSurface — Feed tab", () => {
  it("renders one section per day in caller order", () => {
    renderHM();
    const days = document.querySelectorAll("[data-day]");
    expect(days).toHaveLength(2);
    expect(days[0]?.getAttribute("data-day")).toBe("Today");
    expect(days[1]?.getAttribute("data-day")).toBe("Yesterday");
  });

  it("renders day labels verbatim from caller", () => {
    renderHM();
    const labels = document.querySelectorAll(
      "[data-field='day-label']",
    );
    expect(labels[0]?.textContent).toBe("Today");
    expect(labels[1]?.textContent).toBe("Yesterday");
  });

  it("renders items inside each day in caller order", () => {
    renderHM();
    const todayItems = document
      .querySelector("[data-day='Today']")!
      .querySelectorAll("[data-feed-id]");
    expect(todayItems).toHaveLength(2);
    expect(todayItems[0]?.getAttribute("data-feed-id")).toBe("f-1");
    expect(todayItems[1]?.getAttribute("data-feed-id")).toBe("f-2");
  });

  it("renders the contributor DID in --font-mono", () => {
    renderHM();
    const did = document
      .querySelector("[data-feed-id='f-1']")!
      .querySelector("[data-field='did']") as HTMLElement;
    expect(did.textContent).toBe(
      "did:theourgia:terra.example:diotima",
    );
    expect(did.style.fontFamily).toContain("font-mono");
  });

  it("renders no inline reactions (like/boost/view) on feed cards", () => {
    renderHM();
    const cards = document.querySelectorAll("[data-feed-id]");
    cards.forEach((card) => {
      const text = card.textContent ?? "";
      // No engagement glyphs.
      expect(text).not.toMatch(/[♥❤☆★]/);
      // No engagement words.
      expect(text).not.toMatch(/\blike\b/i);
      expect(text).not.toMatch(/\bboost\b/i);
      expect(text).not.toMatch(/\bview count\b/i);
    });
  });

  it("renders no per-card action buttons (no Reply / Comment / etc)", () => {
    renderHM();
    const card = document.querySelector(
      "[data-feed-id='f-1']",
    ) as HTMLElement;
    expect(card.querySelectorAll("button")).toHaveLength(0);
  });
});

// ─── My submissions tab ───────────────────────────────────────────

describe("HubMemberDashboardSurface — My submissions tab", () => {
  it("renders one row per submission", () => {
    renderHM({ initialTab: "subs" });
    expect(
      document.querySelectorAll("[data-submission-id]"),
    ).toHaveLength(4);
  });

  it("renders status pills with the verbatim label", () => {
    renderHM({ initialTab: "subs" });
    const pending = document
      .querySelector("[data-submission-id='s-1']")!
      .querySelector("[data-pill='status']");
    expect(pending?.textContent).toBe(HM_STATUS_LABELS.pending);
  });

  it("pending pill uses --warn (NEVER --danger)", () => {
    renderHM({ initialTab: "subs" });
    const pill = document
      .querySelector("[data-submission-id='s-1']")!
      .querySelector("[data-pill='status']") as HTMLElement;
    expect(pill.style.background).toContain("--warn-soft");
    expect(pill.style.color).toContain("--warn");
    expect(pill.style.background).not.toContain("--danger");
  });

  it("approved pill uses --peer-ok", () => {
    renderHM({ initialTab: "subs" });
    const pill = document
      .querySelector("[data-submission-id='s-2']")!
      .querySelector("[data-pill='status']") as HTMLElement;
    expect(pill.style.background).toContain("--peer-ok-soft");
    expect(pill.style.color).toContain("--peer-ok");
  });

  it("sent-back and withdrawn pills use --ink-mute (neutral)", () => {
    renderHM({ initialTab: "subs" });
    const sentBack = document
      .querySelector("[data-submission-id='s-3']")!
      .querySelector("[data-pill='status']") as HTMLElement;
    expect(sentBack.style.color).toContain("--ink-mute");
    const withdrawn = document
      .querySelector("[data-submission-id='s-4']")!
      .querySelector("[data-pill='status']") as HTMLElement;
    expect(withdrawn.style.color).toContain("--ink-mute");
  });

  it("renders Withdraw on EVERY row (even already-withdrawn)", () => {
    renderHM({ initialTab: "subs" });
    const withdrawButtons = document.querySelectorAll(
      "[data-action='withdraw']",
    );
    expect(withdrawButtons).toHaveLength(4);
  });

  it("fires onWithdraw with the submission id", () => {
    const onWithdraw = vi.fn();
    renderHM({ initialTab: "subs", onWithdraw });
    const button = document
      .querySelector("[data-submission-id='s-1']")!
      .querySelector("[data-action='withdraw']") as HTMLElement;
    fireEvent.click(button);
    expect(onWithdraw).toHaveBeenCalledWith("s-1");
  });

  it("renders the verbatim cache-persistence disclosure", () => {
    renderHM({ initialTab: "subs" });
    expect(
      screen.getByText(HM_WITHDRAW_DISCLOSURE),
    ).toBeInTheDocument();
  });

  it("Withdraw label is the verbatim copy", () => {
    renderHM({ initialTab: "subs" });
    expect(
      screen.getAllByText(HM_WITHDRAW_LABEL),
    ).toHaveLength(4);
  });
});

// ─── Sharing settings tab ─────────────────────────────────────────

describe("HubMemberDashboardSurface — Sharing settings tab", () => {
  it("renders the verbatim opt-in header", () => {
    renderHM({ initialTab: "sharing" });
    expect(screen.getByText(HM_SHARING_HEADER)).toBeInTheDocument();
  });

  it("renders all four toggles in caller order", () => {
    renderHM({ initialTab: "sharing" });
    const toggles = document.querySelectorAll("[data-toggle]");
    expect(toggles).toHaveLength(4);
    HM_SHARING_TOGGLES.forEach((t, i) => {
      expect(toggles[i]?.getAttribute("data-toggle")).toBe(t.key);
    });
  });

  it("defaults all four toggles to OFF when sharingState is empty", () => {
    renderHM({ initialTab: "sharing", sharingState: {} });
    const toggles = document.querySelectorAll("[data-toggle]");
    toggles.forEach((t) => {
      expect(t.getAttribute("data-on")).toBe("false");
    });
  });

  it("reflects 'on' state when sharingState flips one", () => {
    renderHM({
      initialTab: "sharing",
      sharingState: { "push-publications": true },
    });
    const pub = document.querySelector(
      "[data-toggle='push-publications']",
    );
    expect(pub?.getAttribute("data-on")).toBe("true");
    const wrk = document.querySelector(
      "[data-toggle='push-workings']",
    );
    expect(wrk?.getAttribute("data-on")).toBe("false");
  });

  it("fires onSharingToggle with (key, next-value) when toggled", () => {
    const onSharingToggle = vi.fn();
    renderHM({
      initialTab: "sharing",
      onSharingToggle,
    });
    const input = document.querySelector(
      "[data-input='push-workings']",
    ) as HTMLInputElement;
    fireEvent.click(input);
    expect(onSharingToggle).toHaveBeenCalledWith(
      "push-workings",
      true,
    );
  });
});

// ─── Defensive ─────────────────────────────────────────────────────

describe("HubMemberDashboardSurface — defensive", () => {
  it("renders no 'trending' / 'popular' / 'for you' chrome", () => {
    renderHM();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/for you/i);
  });
});
