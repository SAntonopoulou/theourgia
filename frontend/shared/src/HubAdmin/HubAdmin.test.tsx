/**
 * HubAdminDashboardSurface — unit tests.
 *
 * THE H08 honesty rules covered:
 *
 *   * Reject CTA uses --warn-soft chrome, NEVER --danger (rule 2).
 *   * Approved-pill uses --peer-ok* tokens, NEVER --success.
 *   * DIDs render in --font-mono per the identity-disclosure rule.
 *   * Public-face editor PREVIEWS — onPublicFaceSave fires only
 *     when the "Publish public face changes" CTA is clicked, never
 *     on each keystroke.
 *   * The default tab is "Members" — per the H08 brief.
 *   * Settings tab links to Roles + Audit but never inlines the
 *     matrix or log (separate surfaces — 12 and 14).
 *   * No "trending" / "popular" / "bestseller" chrome anywhere.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type CurationItem,
  HubAdminDashboardSurface,
  type HubMemberRow,
  type HubPublicFaceDraft,
} from "./HubAdminDashboardSurface.js";
import {
  HA_CURATION_APPROVE,
  HA_CURATION_REJECT,
  HA_CURATION_SEND_BACK,
  HA_PUBLIC_HEADER,
  HA_PUBLIC_PUBLISH_CTA,
  HA_SETTINGS_ANALYTICS_HEADING,
  HA_SETTINGS_AUDIT_LINK,
  HA_SETTINGS_ROLES_LINK,
  HA_TAB_LABELS,
} from "./copy.js";

const MEMBERS: HubMemberRow[] = [
  {
    initial: "A",
    name: "Soror Aurora",
    did: "did:theourgia:aurora.example:soror-aurora",
    role: "admin",
    activity: "today",
  },
  {
    initial: "H",
    name: "Frater Hermes",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    role: "officer",
    activity: "2 days ago",
  },
  {
    initial: "Δ",
    name: "Diotima",
    did: "did:theourgia:terra.example:diotima",
    role: "moderator",
    activity: "4 days ago",
  },
];

const CURATION: CurationItem[] = [
  {
    id: "cur-1",
    did: "did:theourgia:terra.example:diotima",
    kind: "entry",
    submitted: "2 hours ago",
    preview: "A working at the dark moon — the air changed.",
    status: "pending",
  },
  {
    id: "cur-2",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    kind: "divination",
    submitted: "yesterday",
    preview: "A three-card draw on the timing of the Deipnon.",
    status: "pending",
  },
  {
    id: "cur-3",
    did: "did:theourgia:aurora.example:soror-aurora",
    kind: "publication",
    submitted: "3 days ago",
    preview: "On the Ephesia Grammata — a short essay.",
    status: "approved",
    approvedAt: "2 days ago",
  },
];

const PUBLIC_FACE: HubPublicFaceDraft = {
  motto: "Tending Hekate's lamp, together.",
  description:
    "A hub for practitioners keeping the crossroads. We share workings, compare notes on the Deipnon, and tend a shared egregore.",
  bannerUrl: null,
};

function renderDefault(
  overrides: Partial<
    Parameters<typeof HubAdminDashboardSurface>[0]
  > = {},
) {
  return render(
    <HubAdminDashboardSurface
      hubName="The Crossroads Coven"
      members={MEMBERS}
      curation={CURATION}
      publicFace={PUBLIC_FACE}
      analyticsOptIn="opt-in"
      {...overrides}
    />,
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────

describe("HubAdminDashboardSurface — tabs", () => {
  it("renders all four tab labels verbatim", () => {
    renderDefault();
    expect(screen.getByText(HA_TAB_LABELS.members)).toBeInTheDocument();
    expect(screen.getByText(HA_TAB_LABELS.curation)).toBeInTheDocument();
    expect(screen.getByText(HA_TAB_LABELS.public)).toBeInTheDocument();
    expect(screen.getByText(HA_TAB_LABELS.settings)).toBeInTheDocument();
  });

  it("defaults to the Members tab", () => {
    renderDefault();
    expect(
      document.querySelector("[data-tab-panel='members']"),
    ).not.toBeNull();
    expect(
      document.querySelector("[data-tab-panel='curation']"),
    ).toBeNull();
  });

  it("switches to Curation when the tab is clicked", () => {
    renderDefault();
    fireEvent.click(
      document.querySelector("[data-tab='curation']") as HTMLElement,
    );
    expect(
      document.querySelector("[data-tab-panel='curation']"),
    ).not.toBeNull();
  });

  it("respects initialTab prop", () => {
    renderDefault({ initialTab: "settings" });
    expect(
      document.querySelector("[data-tab-panel='settings']"),
    ).not.toBeNull();
  });

  it("aria-current is 'page' only on the active tab", () => {
    renderDefault();
    const members = document.querySelector(
      "[data-tab='members']",
    ) as HTMLElement;
    const curation = document.querySelector(
      "[data-tab='curation']",
    ) as HTMLElement;
    expect(members.getAttribute("aria-current")).toBe("page");
    expect(curation.getAttribute("aria-current")).toBeNull();
  });
});

// ─── Breadcrumb ────────────────────────────────────────────────────

describe("HubAdminDashboardSurface — breadcrumb", () => {
  it("renders 'My networks / {hub} · admin'", () => {
    renderDefault();
    expect(screen.getByText("My networks")).toBeInTheDocument();
    expect(
      screen.getByText("The Crossroads Coven · admin"),
    ).toBeInTheDocument();
  });

  it("calls onOpenMyNetworks when the breadcrumb root is clicked", () => {
    const onOpenMyNetworks = vi.fn();
    renderDefault({ onOpenMyNetworks });
    fireEvent.click(
      document.querySelector(
        "[data-action='breadcrumb-root']",
      ) as HTMLElement,
    );
    expect(onOpenMyNetworks).toHaveBeenCalledTimes(1);
  });
});

// ─── Members tab ──────────────────────────────────────────────────

describe("HubAdminDashboardSurface — Members tab", () => {
  it("renders one row per member by default", () => {
    renderDefault();
    expect(
      document.querySelectorAll("[data-member-did]"),
    ).toHaveLength(3);
  });

  it("renders the member's DID in --font-mono", () => {
    renderDefault();
    const row = document.querySelector(
      "[data-member-did='did:theourgia:aurora.example:soror-aurora']",
    ) as HTMLElement;
    const did = row.querySelector("[data-field='did']") as HTMLElement;
    expect(did.textContent).toBe(
      "did:theourgia:aurora.example:soror-aurora",
    );
    expect(did.style.fontFamily).toContain("font-mono");
  });

  it("filters the members table by role", () => {
    renderDefault();
    fireEvent.click(
      document.querySelector(
        "[data-filter-role='officer']",
      ) as HTMLElement,
    );
    expect(
      document.querySelectorAll("[data-member-did]"),
    ).toHaveLength(1);
    expect(
      document
        .querySelector("[data-member-did]")
        ?.getAttribute("data-role"),
    ).toBe("officer");
  });

  it("'All' role filter resets the list", () => {
    renderDefault();
    fireEvent.click(
      document.querySelector(
        "[data-filter-role='officer']",
      ) as HTMLElement,
    );
    fireEvent.click(
      document.querySelector(
        "[data-filter-role='All']",
      ) as HTMLElement,
    );
    expect(
      document.querySelectorAll("[data-member-did]"),
    ).toHaveLength(3);
  });

  it("calls onMemberAction with the member DID on kebab click", () => {
    const onMemberAction = vi.fn();
    renderDefault({ onMemberAction });
    const row = document.querySelector(
      "[data-member-did='did:theourgia:terra.example:diotima']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='member-kebab']") as HTMLElement,
    );
    expect(onMemberAction).toHaveBeenCalledWith(
      "did:theourgia:terra.example:diotima",
    );
  });
});

// ─── Curation tab ─────────────────────────────────────────────────

describe("HubAdminDashboardSurface — Curation tab", () => {
  it("renders one row per item", () => {
    renderDefault({ initialTab: "curation" });
    expect(
      document.querySelectorAll("[data-curation-item]"),
    ).toHaveLength(3);
  });

  it("renders Approve / Send back / Reject ONLY on pending items", () => {
    renderDefault({ initialTab: "curation" });
    const pending = document.querySelector(
      "[data-curation-item='cur-1']",
    ) as HTMLElement;
    expect(
      pending.querySelector("[data-action='approve']"),
    ).not.toBeNull();
    expect(
      pending.querySelector("[data-action='send-back']"),
    ).not.toBeNull();
    expect(
      pending.querySelector("[data-action='reject']"),
    ).not.toBeNull();

    const approved = document.querySelector(
      "[data-curation-item='cur-3']",
    ) as HTMLElement;
    expect(
      approved.querySelector("[data-action='approve']"),
    ).toBeNull();
  });

  it("renders the 'Approved · {when}' pill on approved items in --peer-ok chrome", () => {
    renderDefault({ initialTab: "curation" });
    const approved = document.querySelector(
      "[data-curation-item='cur-3']",
    ) as HTMLElement;
    const pill = approved.querySelector(
      "[data-pill='approved']",
    ) as HTMLElement;
    expect(pill.textContent).toBe("Approved · 2 days ago");
    expect(pill.style.background).toContain("--peer-ok-soft");
    expect(pill.style.color).toContain("--peer-ok");
    expect(pill.style.background).not.toContain("--success");
  });

  it("Reject CTA uses --warn chrome (NEVER --danger)", () => {
    renderDefault({ initialTab: "curation" });
    const reject = document.querySelector(
      "[data-action='reject']",
    ) as HTMLElement;
    expect(reject.textContent).toBe(HA_CURATION_REJECT);
    expect(reject.style.background).toContain("--warn-soft");
    expect(reject.style.borderColor).toContain("--warn-border");
    expect(reject.style.color).toContain("--warn");
    expect(reject.style.background).not.toContain("--danger");
  });

  it("Approve CTA uses --network chrome (the federation context tone)", () => {
    renderDefault({ initialTab: "curation" });
    const approve = document.querySelector(
      "[data-action='approve']",
    ) as HTMLElement;
    expect(approve.textContent).toBe(HA_CURATION_APPROVE);
    expect(approve.style.background).toContain("--network-soft");
    expect(approve.style.borderColor).toContain("--network-line");
  });

  it("Send back CTA is ghost (no --warn / --danger chrome)", () => {
    renderDefault({ initialTab: "curation" });
    const sb = document.querySelector(
      "[data-action='send-back']",
    ) as HTMLElement;
    expect(sb.textContent).toBe(HA_CURATION_SEND_BACK);
    expect(sb.style.background).toContain("transparent");
    expect(sb.style.borderColor).toContain("--line-2");
  });

  it("calls onCurationAction with the item id + action key", () => {
    const onCurationAction = vi.fn();
    renderDefault({ initialTab: "curation", onCurationAction });
    const row = document.querySelector(
      "[data-curation-item='cur-1']",
    ) as HTMLElement;
    fireEvent.click(
      row.querySelector("[data-action='approve']") as HTMLElement,
    );
    fireEvent.click(
      row.querySelector("[data-action='send-back']") as HTMLElement,
    );
    fireEvent.click(
      row.querySelector("[data-action='reject']") as HTMLElement,
    );
    expect(onCurationAction).toHaveBeenNthCalledWith(1, "cur-1", "approve");
    expect(onCurationAction).toHaveBeenNthCalledWith(
      2,
      "cur-1",
      "send-back",
    );
    expect(onCurationAction).toHaveBeenNthCalledWith(3, "cur-1", "reject");
  });
});

// ─── Public face tab ──────────────────────────────────────────────

describe("HubAdminDashboardSurface — Public face tab", () => {
  it("renders the header copy verbatim", () => {
    renderDefault({ initialTab: "public" });
    expect(screen.getByText(HA_PUBLIC_HEADER)).toBeInTheDocument();
  });

  it("pre-populates the motto + description inputs", () => {
    renderDefault({ initialTab: "public" });
    const motto = document.querySelector(
      "[data-field='motto']",
    ) as HTMLInputElement;
    expect(motto.value).toBe(PUBLIC_FACE.motto);
    const desc = document.querySelector(
      "[data-field='description']",
    ) as HTMLTextAreaElement;
    expect(desc.value).toBe(PUBLIC_FACE.description);
  });

  it("does NOT fire onPublicFaceSave on each keystroke", () => {
    const onPublicFaceSave = vi.fn();
    renderDefault({ initialTab: "public", onPublicFaceSave });
    const motto = document.querySelector(
      "[data-field='motto']",
    ) as HTMLInputElement;
    fireEvent.change(motto, { target: { value: "A new motto" } });
    fireEvent.change(motto, { target: { value: "An even newer motto" } });
    expect(onPublicFaceSave).not.toHaveBeenCalled();
  });

  it("fires onPublicFaceSave with the current draft when the CTA is clicked", () => {
    const onPublicFaceSave = vi.fn();
    renderDefault({ initialTab: "public", onPublicFaceSave });
    const motto = document.querySelector(
      "[data-field='motto']",
    ) as HTMLInputElement;
    fireEvent.change(motto, { target: { value: "A new motto" } });
    fireEvent.click(screen.getByText(HA_PUBLIC_PUBLISH_CTA));
    expect(onPublicFaceSave).toHaveBeenCalledTimes(1);
    const draft = onPublicFaceSave.mock.calls[0]?.[0];
    expect(draft).toMatchObject({
      motto: "A new motto",
      description: PUBLIC_FACE.description,
    });
  });
});

// ─── Settings tab ─────────────────────────────────────────────────

describe("HubAdminDashboardSurface — Settings tab", () => {
  it("renders three analytics-opt-in radio options", () => {
    renderDefault({ initialTab: "settings" });
    expect(
      screen.getByText(HA_SETTINGS_ANALYTICS_HEADING),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-radio]"),
    ).toHaveLength(3);
  });

  it("the active option carries data-checked=true on the visual radio", () => {
    renderDefault({ initialTab: "settings", analyticsOptIn: "require-explicit" });
    const active = document.querySelector(
      "[data-visual-radio='require-explicit']",
    ) as HTMLElement;
    expect(active.getAttribute("data-checked")).toBe("true");
    const inactive = document.querySelector(
      "[data-visual-radio='opt-in']",
    ) as HTMLElement;
    expect(inactive.getAttribute("data-checked")).toBe("false");
  });

  it("fires onAnalyticsOptInChange when a different option is selected", () => {
    const onAnalyticsOptInChange = vi.fn();
    renderDefault({
      initialTab: "settings",
      onAnalyticsOptInChange,
    });
    fireEvent.click(
      document.querySelector("[data-radio='require-explicit']") as HTMLElement,
    );
    expect(onAnalyticsOptInChange).toHaveBeenCalledWith("require-explicit");
  });

  it("links to Roles + Audit (does NOT inline them)", () => {
    const onOpenRoles = vi.fn();
    const onOpenAuditLog = vi.fn();
    renderDefault({ initialTab: "settings", onOpenRoles, onOpenAuditLog });
    fireEvent.click(screen.getByText(HA_SETTINGS_ROLES_LINK));
    fireEvent.click(screen.getByText(HA_SETTINGS_AUDIT_LINK));
    expect(onOpenRoles).toHaveBeenCalledTimes(1);
    expect(onOpenAuditLog).toHaveBeenCalledTimes(1);
  });
});

// ─── Defensive anti-popularity / anti-danger ─────────────────────

describe("HubAdminDashboardSurface — defensive chrome", () => {
  it("renders no 'trending' / 'popular' / 'leaderboard' chrome anywhere", () => {
    renderDefault();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/leaderboard/i);
  });

  it("no curation CTA uses --danger ink", () => {
    renderDefault({ initialTab: "curation" });
    const ctas = document.querySelectorAll(
      "[data-action='approve'], [data-action='send-back'], [data-action='reject']",
    );
    ctas.forEach((cta) => {
      const el = cta as HTMLElement;
      expect(el.style.color).not.toContain("--danger");
      expect(el.style.background).not.toContain("--danger");
      expect(el.style.borderColor).not.toContain("--danger");
    });
  });
});
