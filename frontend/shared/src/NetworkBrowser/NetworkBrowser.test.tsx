/**
 * NetworkBrowserSurface — unit tests.
 *
 * THE H08 honesty rules covered:
 *
 *   * All four status pills (Successful / Pending / Refused /
 *     Blocked) read from the `--peer-*` token family. NONE uses
 *     `--danger` (rule 2 carry-forward).
 *   * The local instance is pinned at the top regardless of filters.
 *   * The community-blocklist subscription is OPT-IN (renders
 *     "Not subscribed." until the caller explicitly flips
 *     `blocklistSubscribed`).
 *   * Status filter chips can toggle on/off; counts on the rail
 *     reflect the FULL set, not the filtered set, so the rail
 *     numbers stay stable.
 *   * No "trusted" / "untrusted" / "verified" reputation labels
 *     anywhere — peers are tones-of-warn, never colour-coded to
 *     a judgement.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  NetworkBrowserSurface,
  type PeerInstance,
} from "./NetworkBrowserSurface.js";
import {
  NB_LOCAL_PILL,
  NB_STATUS_LABELS,
  NB_SUBTITLE,
  NB_TITLE,
  NB_TRUST_CTA,
  NB_TRUST_NOT_SUBSCRIBED,
  NB_TRUST_TITLE,
} from "./copy.js";

const PEERS: PeerInstance[] = [
  {
    domain: "hearth.sophia.example",
    tradition: "Hellenic · Thelemic",
    handshake: "successful",
    heartbeat: "just now",
    isLocal: true,
  },
  {
    domain: "aurora.example",
    tradition: "Hermetic",
    handshake: "successful",
    heartbeat: "4 minutes ago",
    isLocal: false,
  },
  {
    domain: "terra.example",
    tradition: "Folk",
    handshake: "successful",
    heartbeat: "11 minutes ago",
    isLocal: false,
  },
  {
    domain: "newcomer.example",
    tradition: "Independent",
    handshake: "pending",
    heartbeat: "never",
    isLocal: false,
  },
  {
    domain: "closed.example",
    tradition: "Unknown",
    handshake: "refused",
    heartbeat: "3 days ago",
    isLocal: false,
  },
  {
    domain: "spam.example",
    tradition: "Unknown",
    handshake: "blocked",
    heartbeat: "never",
    isLocal: false,
  },
];

// ─── Chrome ────────────────────────────────────────────────────────

describe("NetworkBrowserSurface — chrome", () => {
  it("renders the title + subtitle", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    expect(screen.getByText(NB_TITLE)).toBeInTheDocument();
    expect(screen.getByText(NB_SUBTITLE)).toBeInTheDocument();
  });

  it("pins the local instance row at the top in --network framing", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const local = document.querySelector("[data-peer-local='true']") as HTMLElement;
    expect(local).not.toBeNull();
    expect(local.textContent).toContain("hearth.sophia.example");
    expect(local.style.background).toContain("--network-soft");
    expect(local.style.borderColor).toContain("--network-line");
    expect(screen.getByText(NB_LOCAL_PILL)).toBeInTheDocument();
  });

  it("does NOT render a kebab on the local row", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const local = document.querySelector("[data-peer-local='true']");
    expect(
      local!.querySelector("[data-action='peer-kebab']"),
    ).toBeNull();
  });
});

// ─── Status filter ─────────────────────────────────────────────────

describe("NetworkBrowserSurface — status filter", () => {
  it("renders one filter chip per handshake state", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    expect(
      document.querySelectorAll("[data-filter-status]").length,
    ).toBe(4);
  });

  it("rail counts reflect the FULL set (not the filtered)", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    expect(
      document.querySelector("[data-count='successful']")?.textContent,
    ).toBe("2");
    expect(
      document.querySelector("[data-count='pending']")?.textContent,
    ).toBe("1");
    expect(
      document.querySelector("[data-count='refused']")?.textContent,
    ).toBe("1");
    expect(
      document.querySelector("[data-count='blocked']")?.textContent,
    ).toBe("1");
    // Clicking a filter must NOT change the counts.
    fireEvent.click(
      document.querySelector(
        "[data-filter-status='blocked']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-count='successful']")?.textContent,
    ).toBe("2");
  });

  it("filters the peer list by active status", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    // Default 'all' → 5 non-local peers visible.
    expect(
      document.querySelectorAll("[data-peer]").length,
    ).toBe(5);
    // Click 'refused' → only 1 row visible.
    fireEvent.click(
      document.querySelector(
        "[data-filter-status='refused']",
      ) as HTMLElement,
    );
    expect(
      document.querySelectorAll("[data-peer]").length,
    ).toBe(1);
    expect(
      document.querySelectorAll("[data-status='refused']").length,
    ).toBe(1);
  });

  it("clicking the active filter again clears the filter", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const blocked = document.querySelector(
      "[data-filter-status='blocked']",
    ) as HTMLElement;
    fireEvent.click(blocked);
    expect(document.querySelectorAll("[data-peer]").length).toBe(1);
    fireEvent.click(blocked);
    expect(document.querySelectorAll("[data-peer]").length).toBe(5);
  });

  it("local row is pinned even when the status filter would hide its handshake", () => {
    // The local row has handshake='successful'; filtering to 'blocked'
    // must NOT remove it.
    render(<NetworkBrowserSurface peers={PEERS} />);
    fireEvent.click(
      document.querySelector(
        "[data-filter-status='blocked']",
      ) as HTMLElement,
    );
    expect(
      document.querySelector("[data-peer-local='true']"),
    ).not.toBeNull();
  });
});

// ─── Status pill chrome (the --warn-not-danger lock) ──────────────

describe("NetworkBrowserSurface — status pill chrome", () => {
  it("Successful pill reads from --peer-ok tokens", () => {
    render(
      <NetworkBrowserSurface
        peers={[
          { ...PEERS[1]! },
          { ...PEERS[0]! }, // keep local row
        ]}
      />,
    );
    const pill = document.querySelector(
      "[data-status='successful'] [data-pill='status']",
    ) as HTMLElement;
    expect(pill.style.background).toContain("--peer-ok-soft");
    expect(pill.style.borderColor).toContain("--peer-ok");
    expect(pill.style.color).toContain("--peer-ok");
  });

  it("Pending pill reads from --peer-pending tokens", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const pill = document.querySelector(
      "[data-status='pending'] [data-pill='status']",
    ) as HTMLElement;
    expect(pill.style.background).toContain("--peer-pending-soft");
  });

  it("Refused pill is --peer-refused, NEVER --danger", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const pill = document.querySelector(
      "[data-status='refused'] [data-pill='status']",
    ) as HTMLElement;
    expect(pill.style.background).toContain("--peer-refused-soft");
    expect(pill.style.background).not.toContain("--danger");
    expect(pill.style.borderColor).not.toContain("--danger");
  });

  it("Blocked pill is --peer-blocked, NEVER --danger", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const pill = document.querySelector(
      "[data-status='blocked'] [data-pill='status']",
    ) as HTMLElement;
    expect(pill.style.background).toContain("--peer-blocked-soft");
    expect(pill.style.background).not.toContain("--danger");
  });

  it("renders the verbatim status label inside the pill", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const pill = document.querySelector(
      "[data-status='blocked'] [data-pill='status']",
    ) as HTMLElement;
    expect(pill.textContent).toContain(NB_STATUS_LABELS.blocked);
  });
});

// ─── Per-row meta + actions ───────────────────────────────────────

describe("NetworkBrowserSurface — peer rows", () => {
  it("renders the tradition + last-heartbeat meta inline", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const row = document.querySelector(
      "[data-peer='aurora.example'] [data-field='meta']",
    );
    expect(row?.textContent).toBe("Hermetic · last heartbeat 4 minutes ago");
  });

  it("calls onPeerAction with the peer domain when kebab clicked", () => {
    const onPeerAction = vi.fn();
    render(
      <NetworkBrowserSurface peers={PEERS} onPeerAction={onPeerAction} />,
    );
    const kebab = document.querySelector(
      "[data-peer='terra.example'] [data-action='peer-kebab']",
    ) as HTMLElement;
    fireEvent.click(kebab);
    expect(onPeerAction).toHaveBeenCalledWith("terra.example");
  });

  it("renders the domain in --font-mono per the identity rule", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const domain = document.querySelector(
      "[data-peer='aurora.example'] [data-field='domain']",
    ) as HTMLElement;
    expect(domain.textContent).toBe("aurora.example");
    expect(domain.style.fontFamily).toContain("font-mono");
  });
});

// ─── Trust ledger ─────────────────────────────────────────────────

describe("NetworkBrowserSurface — trust ledger", () => {
  it("renders the trust-ledger title verbatim", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    expect(screen.getByText(NB_TRUST_TITLE)).toBeInTheDocument();
  });

  it("defaults to 'Not subscribed.' status", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    expect(screen.getByText(NB_TRUST_NOT_SUBSCRIBED)).toBeInTheDocument();
  });

  it("reflects subscribed state when caller flips the flag", () => {
    render(
      <NetworkBrowserSurface peers={PEERS} blocklistSubscribed />,
    );
    const status = document.querySelector(
      "[data-field='blocklist-status']",
    );
    expect(status?.textContent).toBe("Subscribed.");
  });

  it("fires onConfigureBlocklist when Configure clicked", () => {
    const onConfigureBlocklist = vi.fn();
    render(
      <NetworkBrowserSurface
        peers={PEERS}
        onConfigureBlocklist={onConfigureBlocklist}
      />,
    );
    fireEvent.click(screen.getByText(NB_TRUST_CTA));
    expect(onConfigureBlocklist).toHaveBeenCalledTimes(1);
  });
});

// ─── Defensive anti-judgement chrome ──────────────────────────────

describe("NetworkBrowserSurface — defensive anti-judgement chrome", () => {
  it("renders no 'trusted' / 'untrusted' / 'verified' labels anywhere", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\btrusted\b/i);
    expect(text).not.toMatch(/\buntrusted\b/i);
    expect(text).not.toMatch(/\bverified\b/i);
  });

  it("no pill chrome contains --danger anywhere on the surface", () => {
    render(<NetworkBrowserSurface peers={PEERS} />);
    const pills = document.querySelectorAll("[data-pill='status']");
    pills.forEach((pill) => {
      const el = pill as HTMLElement;
      expect(el.style.background).not.toContain("--danger");
      expect(el.style.borderColor).not.toContain("--danger");
      expect(el.style.color).not.toContain("--danger");
    });
  });
});
