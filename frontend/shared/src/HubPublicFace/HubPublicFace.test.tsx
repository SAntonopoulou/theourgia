/**
 * HubPublicFaceSurface — unit tests.
 *
 * The defining honesty rules:
 *
 *   * No member-count anywhere on the surface (rule 18) — the
 *     props don't even accept one.
 *   * `‡ Powered by Theourgia (AGPLv3)` footer verbatim (rule 7).
 *   * Member / Pending chips use --peer-ok / --warn families,
 *     NEVER --danger (rule 2).
 *   * CTA matrix: Public → Join; OWA → Request to join; Private
 *     → invitation-only disabled; member → already a member
 *     disabled; pending → request pending disabled. Six exact
 *     combinations.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type HubFeaturedItem,
  HubPublicFaceSurface,
  type HubViewerState,
  type MembershipPolicy,
} from "./HubPublicFaceSurface.js";
import {
  HPF_AGPL_CREDIT,
  HPF_CTA_ALREADY_MEMBER,
  HPF_CTA_INVITATION_ONLY,
  HPF_CTA_JOIN_PUBLIC,
  HPF_CTA_REQUEST_PENDING,
  HPF_CTA_REQUEST_TO_JOIN,
  HPF_ESTABLISHED_PREFIX,
  HPF_MEMBER_CHIP,
  HPF_PENDING_CHIP,
  HPF_POLICY_COPY,
} from "./copy.js";

const FEATURED: HubFeaturedItem[] = [
  {
    id: "feat-1",
    title: "On the Ephesia Grammata",
    author: "Soror Aurora",
    href: "/reader/aurora/ephesia-grammata",
  },
  {
    id: "feat-2",
    title: "Keeping the Deipnon",
    author: "Diotima",
  },
];

function renderHub(
  overrides: Partial<
    Parameters<typeof HubPublicFaceSurface>[0]
  > = {},
) {
  return render(
    <HubPublicFaceSurface
      hubName="The Crossroads Coven"
      motto="Tending Hekate's lamp, together."
      traditions={["Hellenic"]}
      establishedAt="March 2024"
      monogram="Κ"
      about="A hub for practitioners keeping the crossroads."
      featured={FEATURED}
      policy="open-with-approval"
      viewer="anonymous"
      {...overrides}
    />,
  );
}

// ─── Hero chrome ───────────────────────────────────────────────────

describe("HubPublicFaceSurface — hero chrome", () => {
  it("renders the hub name as h1", () => {
    renderHub();
    expect(
      screen.getByRole("heading", { level: 1, name: "The Crossroads Coven" }),
    ).toBeInTheDocument();
  });

  it("renders the motto in italic", () => {
    renderHub();
    const motto = document.querySelector(
      "[data-field='motto']",
    ) as HTMLElement;
    expect(motto.textContent).toBe(
      "Tending Hekate's lamp, together.",
    );
    expect(motto.style.fontStyle).toBe("italic");
  });

  it("renders one pill per tradition", () => {
    renderHub({ traditions: ["Hellenic", "Theurgic"] });
    expect(
      document.querySelectorAll("[data-pill='tradition']"),
    ).toHaveLength(2);
  });

  it("renders 'Established {when}' verbatim", () => {
    renderHub({ establishedAt: "March 2024" });
    const established = document.querySelector(
      "[data-field='established']",
    ) as HTMLElement;
    expect(established.textContent).toBe(
      `${HPF_ESTABLISHED_PREFIX}March 2024`,
    );
  });

  it("does NOT render a banner image url when none supplied", () => {
    renderHub({ bannerImageUrl: null });
    const banner = document.querySelector(
      "[data-block='banner']",
    ) as HTMLElement;
    expect(banner.style.backgroundImage).not.toContain("url(");
  });

  it("renders the banner image when supplied", () => {
    renderHub({ bannerImageUrl: "/images/coven-banner.jpg" });
    const banner = document.querySelector(
      "[data-block='banner']",
    ) as HTMLElement;
    expect(banner.style.backgroundImage).toMatch(
      /url\(["']?\/images\/coven-banner\.jpg["']?\)/,
    );
  });
});

// ─── Viewer chips ──────────────────────────────────────────────────

describe("HubPublicFaceSurface — viewer chips", () => {
  it("anonymous viewer sees no member/pending chip", () => {
    renderHub({ viewer: "anonymous" });
    expect(document.querySelector("[data-chip='member']")).toBeNull();
    expect(document.querySelector("[data-chip='pending']")).toBeNull();
  });

  it("member viewer gets the verbatim --peer-ok chip", () => {
    renderHub({ viewer: "member" });
    const chip = document.querySelector("[data-chip='member']") as HTMLElement;
    expect(chip.textContent).toBe(HPF_MEMBER_CHIP);
    expect(chip.style.background).toContain("--peer-ok-soft");
    expect(chip.style.color).toContain("--peer-ok");
    expect(chip.style.background).not.toContain("--danger");
  });

  it("pending viewer gets the verbatim --warn-soft chip", () => {
    renderHub({ viewer: "pending" });
    const chip = document.querySelector(
      "[data-chip='pending']",
    ) as HTMLElement;
    expect(chip.textContent).toBe(HPF_PENDING_CHIP);
    expect(chip.style.background).toContain("--warn-soft");
    expect(chip.style.color).toContain("--warn");
    expect(chip.style.background).not.toContain("--danger");
  });
});

// ─── Featured grid ────────────────────────────────────────────────

describe("HubPublicFaceSurface — featured", () => {
  it("renders one card per featured item", () => {
    renderHub();
    expect(
      document.querySelectorAll("[data-feature-id]"),
    ).toHaveLength(2);
  });

  it("renders items with href as <a>, without as <button>", () => {
    renderHub();
    const linked = document.querySelector(
      "[data-feature-id='feat-1']",
    ) as HTMLElement;
    expect(linked.tagName).toBe("A");
    const unlinked = document.querySelector(
      "[data-feature-id='feat-2']",
    ) as HTMLElement;
    expect(unlinked.tagName).toBe("BUTTON");
  });

  it("fires onOpenFeatured for buttoned items", () => {
    const onOpenFeatured = vi.fn();
    renderHub({ onOpenFeatured });
    const unlinked = document.querySelector(
      "[data-feature-id='feat-2']",
    ) as HTMLElement;
    fireEvent.click(unlinked);
    expect(onOpenFeatured).toHaveBeenCalledWith("feat-2");
  });

  it("omits the featured section when the list is empty", () => {
    renderHub({ featured: [] });
    expect(document.querySelector("[data-block='featured']")).toBeNull();
  });
});

// ─── Policy band + CTA matrix ─────────────────────────────────────

const CTA_MATRIX: ReadonlyArray<{
  policy: MembershipPolicy;
  viewer: HubViewerState;
  label: string;
  disabled: boolean;
}> = [
  { policy: "public", viewer: "anonymous", label: HPF_CTA_JOIN_PUBLIC, disabled: false },
  {
    policy: "open-with-approval",
    viewer: "anonymous",
    label: HPF_CTA_REQUEST_TO_JOIN,
    disabled: false,
  },
  {
    policy: "private",
    viewer: "anonymous",
    label: HPF_CTA_INVITATION_ONLY,
    disabled: true,
  },
  {
    policy: "public",
    viewer: "member",
    label: HPF_CTA_ALREADY_MEMBER,
    disabled: true,
  },
  {
    policy: "open-with-approval",
    viewer: "pending",
    label: HPF_CTA_REQUEST_PENDING,
    disabled: true,
  },
  {
    policy: "private",
    viewer: "member",
    label: HPF_CTA_ALREADY_MEMBER,
    disabled: true,
  },
];

describe("HubPublicFaceSurface — policy band", () => {
  it("renders the policy title + subtitle verbatim", () => {
    renderHub({ policy: "open-with-approval" });
    const title = document.querySelector(
      "[data-field='policy-title']",
    ) as HTMLElement;
    const sub = document.querySelector(
      "[data-field='policy-subtitle']",
    ) as HTMLElement;
    expect(title.textContent).toBe(
      HPF_POLICY_COPY["open-with-approval"].title,
    );
    expect(sub.textContent).toBe(
      HPF_POLICY_COPY["open-with-approval"].subtitle,
    );
  });

  it.each(CTA_MATRIX)(
    "policy=$policy + viewer=$viewer → label=$label · disabled=$disabled",
    ({ policy, viewer, label, disabled }) => {
      renderHub({ policy, viewer });
      const cta = document.querySelector(
        "[data-action='join']",
      ) as HTMLButtonElement;
      expect(cta.textContent).toBe(label);
      expect(cta.disabled).toBe(disabled);
    },
  );

  it("fires onJoin when an enabled CTA is clicked", () => {
    const onJoin = vi.fn();
    renderHub({ policy: "open-with-approval", viewer: "anonymous", onJoin });
    fireEvent.click(
      document.querySelector("[data-action='join']") as HTMLElement,
    );
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onJoin when the CTA is disabled", () => {
    const onJoin = vi.fn();
    renderHub({ policy: "private", viewer: "anonymous", onJoin });
    fireEvent.click(
      document.querySelector("[data-action='join']") as HTMLElement,
    );
    expect(onJoin).not.toHaveBeenCalled();
  });
});

// ─── Footer ────────────────────────────────────────────────────────

describe("HubPublicFaceSurface — footer", () => {
  it("renders the AGPL credit verbatim with the ‡ glyph", () => {
    renderHub();
    const credit = document.querySelector(
      "[data-field='agpl-credit']",
    ) as HTMLElement;
    expect(credit.textContent).toBe(HPF_AGPL_CREDIT);
    expect(credit.textContent).toMatch(/^‡ /);
  });

  it("renders the optional epigraph above the credit", () => {
    renderHub({
      footerEpigraph: "The road is long, and she keeps it longer.",
    });
    expect(
      screen.getByText(
        "The road is long, and she keeps it longer.",
      ),
    ).toBeInTheDocument();
  });

  it("omits the epigraph node when none supplied", () => {
    renderHub();
    expect(
      document.querySelector("[data-field='epigraph']"),
    ).toBeNull();
  });
});

// ─── Defensive — NO member-count, NO popularity chrome ────────────

describe("HubPublicFaceSurface — defensive", () => {
  it("renders no '{n} members' text anywhere", () => {
    renderHub({ viewer: "anonymous" });
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\d+\s+members?/i);
  });

  it("renders no 'trending' / 'popular' chrome", () => {
    renderHub();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/trending/i);
    expect(text).not.toMatch(/popular/i);
    expect(text).not.toMatch(/join the conversation/i);
  });

  it("HubPublicFaceSurfaceProps does NOT expose a memberCount field", () => {
    // Compile-time check via a value-level expression. If someone
    // adds a memberCount field to the props, this expression no
    // longer type-checks and CI fails.
    type Props = Parameters<typeof HubPublicFaceSurface>[0];
    type HasMemberCount = "memberCount" extends keyof Props
      ? true
      : false;
    const hasMemberCount: HasMemberCount = false;
    expect(hasMemberCount).toBe(false);
  });
});
