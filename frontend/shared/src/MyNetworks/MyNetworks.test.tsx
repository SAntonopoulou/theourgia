/**
 * MyNetworksSurface — unit tests.
 *
 * THE H08 honesty rules covered:
 *
 *   * Accept buttons are NEVER `--danger` (rule 2 carry-forward).
 *   * Empty-state copy is verbatim from the H08 supplement —
 *     a single drift catches future copy edits.
 *   * Pending invitations show NO member count and NO "popularity"
 *     stat (rule 18).
 *   * Member rows show ONE muted "Last activity {when}" line and
 *     nothing that resembles a streak / red-dot affordance.
 *   * The "+ Discover hubs" CTA is present even when the surface
 *     is empty (the empty state needs an obvious next step).
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type HubInvitationCard,
  type HubMembershipCard,
  MyNetworksSurface,
} from "./MyNetworksSurface.js";
import {
  MN_ACCEPT_LABEL,
  MN_DECLINE_LABEL,
  MN_DISCOVER_CTA,
  MN_EMPTY_BODY,
  MN_EMPTY_TITLE,
  MN_SUBTITLE,
  MN_TITLE,
} from "./copy.js";

// ─── Fixtures ─────────────────────────────────────────────────────

const HUBS: HubMembershipCard[] = [
  {
    hubId: "hub-1",
    hubName: "The Crossroads Coven",
    tradition: "Hellenic",
    role: "officer",
    lastActivity: "2 days ago",
    initial: "Κ",
    initialBg: "var(--network-soft)",
  },
  {
    hubId: "hub-2",
    hubName: "Lodge of the Silver Star",
    tradition: "Thelemic",
    role: "member",
    lastActivity: "5 days ago",
    initial: "A",
  },
];

const INVITES: HubInvitationCard[] = [
  {
    hubId: "inv-1",
    hubName: "The Hermetic Circle",
    invitedBy: "did:theourgia:aurora.example:soror-aurora",
    note: "We read your essay on the crossroads — would be glad to have you.",
    initial: "Ⲏ",
  },
  {
    hubId: "inv-2",
    hubName: "Geomancers' Table",
    invitedBy: "did:theourgia:terra.example:frater-v",
    initial: "G",
  },
];

// ─── Title + chrome ────────────────────────────────────────────────

describe("MyNetworksSurface — chrome", () => {
  it("renders the title and subtitle from copy", () => {
    render(<MyNetworksSurface hubs={[]} invites={[]} />);
    expect(screen.getByText(MN_TITLE)).toBeInTheDocument();
    expect(screen.getByText(MN_SUBTITLE)).toBeInTheDocument();
  });

  it("renders the Discover hubs CTA in the header", () => {
    render(<MyNetworksSurface hubs={[]} invites={[]} />);
    const ctas = screen.getAllByText(MN_DISCOVER_CTA);
    // One in the header, one in the empty state.
    expect(ctas.length).toBeGreaterThanOrEqual(1);
  });

  it("fires onDiscover when the header CTA is clicked", () => {
    const onDiscover = vi.fn();
    render(
      <MyNetworksSurface hubs={HUBS} invites={[]} onDiscover={onDiscover} />,
    );
    const headerCta = document.querySelector("[data-action='discover']");
    expect(headerCta).not.toBeNull();
    fireEvent.click(headerCta!);
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });
});

// ─── Member rows ───────────────────────────────────────────────────

describe("MyNetworksSurface — member rows", () => {
  it("renders one row per hub in order", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    const rows = document.querySelectorAll("[data-hub-id]");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.getAttribute("data-hub-id")).toBe("hub-1");
    expect(rows[1]?.getAttribute("data-hub-id")).toBe("hub-2");
  });

  it("renders 'Last activity {when}' for each hub", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    const meta = document.querySelectorAll("[data-meta='activity']");
    expect(meta).toHaveLength(2);
    expect(meta[0]?.textContent).toBe("Last activity 2 days ago");
    expect(meta[1]?.textContent).toBe("Last activity 5 days ago");
  });

  it("renders the role pill verbatim (no capitalisation)", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    const rolePills = document.querySelectorAll("[data-pill='role']");
    expect(rolePills[0]?.textContent).toBe("officer");
    expect(rolePills[1]?.textContent).toBe("member");
  });

  it("renders the tradition pill verbatim", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    const pills = document.querySelectorAll("[data-pill='tradition']");
    expect(pills[0]?.textContent).toBe("Hellenic");
    expect(pills[1]?.textContent).toBe("Thelemic");
  });

  it("calls onOpenHub when a row is clicked", () => {
    const onOpenHub = vi.fn();
    render(
      <MyNetworksSurface
        hubs={HUBS}
        invites={[]}
        onOpenHub={onOpenHub}
      />,
    );
    const row = document.querySelector("[data-hub-id='hub-1']") as HTMLElement;
    fireEvent.click(row);
    expect(onOpenHub).toHaveBeenCalledWith("hub-1");
  });
});

// ─── Invitations ─────────────────────────────────────────────────

describe("MyNetworksSurface — invitations", () => {
  it("renders Accept + Decline for every invitation", () => {
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    expect(screen.getAllByText(MN_ACCEPT_LABEL)).toHaveLength(2);
    expect(screen.getAllByText(MN_DECLINE_LABEL)).toHaveLength(2);
  });

  it("renders the 'Invited by {DID}' line in monospace", () => {
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    const by = document.querySelectorAll("[data-field='invited-by']");
    expect(by[0]?.textContent).toBe(
      "Invited by did:theourgia:aurora.example:soror-aurora",
    );
    expect(
      (by[0] as HTMLElement).style.fontFamily,
    ).toContain("font-mono");
  });

  it("renders the inviter's note when present", () => {
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    expect(
      screen.getByText(/read your essay on the crossroads/),
    ).toBeInTheDocument();
  });

  it("does NOT render a note element when none is supplied", () => {
    render(<MyNetworksSurface hubs={[]} invites={[INVITES[1]!]} />);
    expect(
      document.querySelector("[data-field='note']"),
    ).toBeNull();
  });

  it("Accept uses --warn chrome (NEVER --danger)", () => {
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    const accept = document.querySelector(
      "[data-action='accept']",
    ) as HTMLElement;
    // The chrome reads from --warn-soft / --warn-border. We verify by
    // inspecting the inline style — the CSS-var references are literal.
    expect(accept.style.background).toContain("--warn-soft");
    expect(accept.style.borderColor).toContain("--warn-border");
    expect(accept.style.background).not.toContain("--danger");
  });

  it("calls onAcceptInvite with the hub id", () => {
    const onAcceptInvite = vi.fn();
    render(
      <MyNetworksSurface
        hubs={[]}
        invites={INVITES}
        onAcceptInvite={onAcceptInvite}
      />,
    );
    const acceptButtons = document.querySelectorAll("[data-action='accept']");
    fireEvent.click(acceptButtons[0]!);
    expect(onAcceptInvite).toHaveBeenCalledWith("inv-1");
  });

  it("calls onDeclineInvite with the hub id", () => {
    const onDeclineInvite = vi.fn();
    render(
      <MyNetworksSurface
        hubs={[]}
        invites={INVITES}
        onDeclineInvite={onDeclineInvite}
      />,
    );
    const declineButtons = document.querySelectorAll(
      "[data-action='decline']",
    );
    fireEvent.click(declineButtons[1]!);
    expect(onDeclineInvite).toHaveBeenCalledWith("inv-2");
  });

  it("does NOT render any member-count chrome on an invitation", () => {
    // The H08 brief is explicit: pending invitations carry no
    // popularity / member-count signal — only contributor name +
    // note + actions.
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    // Defensive: search the whole surface for any "{n} members"-
    // shaped string. Any future commit that adds one fails here.
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\d+\s+members?/i);
    expect(text).not.toMatch(/popularity/i);
  });
});

// ─── Empty state ─────────────────────────────────────────────────

describe("MyNetworksSurface — empty state", () => {
  it("renders the empty-state title verbatim", () => {
    render(<MyNetworksSurface hubs={[]} invites={[]} />);
    expect(screen.getByText(MN_EMPTY_TITLE)).toBeInTheDocument();
  });

  it("renders the empty-state body verbatim", () => {
    // Verbatim copy lock — a future commit that paraphrases the
    // 'Hubs are how practitioners federate selectively' line gets
    // caught here.
    render(<MyNetworksSurface hubs={[]} invites={[]} />);
    expect(screen.getByText(MN_EMPTY_BODY)).toBeInTheDocument();
  });

  it("renders the empty-state Discover hubs CTA", () => {
    render(<MyNetworksSurface hubs={[]} invites={[]} />);
    const empty = document.querySelector("[data-state='empty']");
    expect(empty).not.toBeNull();
    // The CTA inside the empty state is a real button (not a link).
    const cta = empty!.querySelector("button");
    expect(cta?.textContent).toBe(MN_DISCOVER_CTA);
  });

  it("does NOT render the empty state when there are hubs", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    expect(document.querySelector("[data-state='empty']")).toBeNull();
  });

  it("does NOT render the empty state when there are invitations", () => {
    render(<MyNetworksSurface hubs={[]} invites={INVITES} />);
    expect(document.querySelector("[data-state='empty']")).toBeNull();
  });
});

// ─── Anti-gamification + defensive rules ─────────────────────────

describe("MyNetworksSurface — defensive anti-gamification", () => {
  it("renders no 'trending' / 'popular' / 'streak' chrome anywhere", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={INVITES} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/streak/i);
  });

  it("renders no red-dot / active-now indicator on hub rows", () => {
    render(<MyNetworksSurface hubs={HUBS} invites={[]} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/active now/i);
    expect(text).not.toMatch(/online/i);
  });
});
