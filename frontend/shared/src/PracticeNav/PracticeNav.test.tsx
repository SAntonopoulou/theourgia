import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_VAULT_NAV } from "../VaultNav/index.js";
import {
  HAS_PLATFORM_WING,
  HIDDEN_UNTIL_FINISHED,
  PLATFORM_WING_SECTIONS,
  PRACTICE_WING_SECTIONS,
  PracticeNav,
  VISIBLE_PRACTICE_SECTIONS,
  wingForKey,
} from "./index.js";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("PracticeNav — practice wing (default)", () => {
  it("renders only the sections the gate leaves standing", () => {
    render(<PracticeNav />);
    // ⚠ Derived from the gate, not hard-coded. A test listing headings by
    // hand goes stale the day a feature is finished, and then reads as a
    // failure when it is actually the news.
    for (const section of VISIBLE_PRACTICE_SECTIONS) {
      // Today renders as a single unlabelled row (the phone mirror) — it has
      // no heading text to find.
      if (!section.heading) continue;
      expect(screen.getByText(section.heading)).toBeInTheDocument();
    }
    expect(screen.queryByText("Publications")).toBeNull();
    expect(screen.queryByText("Ritual feed")).toBeNull();
    expect(screen.queryByText("Plugins")).toBeNull();
  });

  it("renders every VISIBLE practice-wing link", () => {
    render(<PracticeNav />);
    const labels = VISIBLE_PRACTICE_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("⚠ hides everything the phone has no counterpart for", () => {
    render(<PracticeNav />);
    // Sophia, 15 August: the site shows what the app shows, until a feature
    // is finished on both. This is that rule, asserted rather than trusted.
    for (const label of [
      "Magical beings",
      "Library",
      "Sigils",
      "Talismans",
      "Magical circle",
      "Tool registry",
      "Synchronicities",
      "Tetraktys ladder",
      "Awaiting judgment",
      "Analytics",
    ]) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("⚠ hides the MENU and not the route", () => {
    // The pages still exist and still answer to anyone who types the URL.
    // Nothing here is access control, and a later reader should not mistake
    // it for any — see HIDDEN_UNTIL_FINISHED.
    expect(HIDDEN_UNTIL_FINISHED.has("sigils")).toBe(true);
    const hiddenButRouted = PRACTICE_WING_SECTIONS.flatMap((s) =>
      s.items.filter((i) => HIDDEN_UNTIL_FINISHED.has(i.key)),
    );
    for (const item of hiddenButRouted) {
      expect(item.to.startsWith("/")).toBe(true);
    }
  });

  it("keeps divination, which the phone has, and folds astragaloi under it", () => {
    const { container } = render(<PracticeNav />);
    // Divination is a Practices-tier row.
    expect(container.querySelector('a[href="/divination/tarot"]')).not.toBeNull();
    // Astragaloi is a divination sub-kind, reached inside Divination on the
    // phone — not a menu row of its own. Its route still answers.
    expect(container.querySelector('a[href="/divination/astragaloi"]')).toBeNull();
    expect(HIDDEN_UNTIL_FINISHED.has("astragaloi")).toBe(true);
  });

  it("surfaces voces, gematria and transliteration as plain rows (no 'More tools')", () => {
    const { container } = render(<PracticeNav />);
    // The phone has no disclosure — its utilities and letters-and-numbers are
    // just rows. So there is no "More tools" button here any more.
    expect(screen.queryByRole("button", { name: /more tools/i })).toBeNull();
    for (const href of ["/voces", "/gematria", "/transliterations"]) {
      expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
    // Magic squares stays gated out entirely — Sophia's call, 20 Aug.
    expect(screen.queryByText("Magic squares")).toBeNull();
    expect(container.querySelector('a[href="/magic-squares"]')).toBeNull();
  });

  it("highlights the letters-and-numbers row when its route is active", () => {
    render(<PracticeNav active="gematria" />);
    const link = screen.getByText("Letters and numbers").closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
  });
});

describe("PracticeNav — the phone drawer, mirrored", () => {
  it("puts Today first, then Practices, then Utilities", () => {
    render(<PracticeNav />);
    // The three tiers the phone opens with, in order.
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Practices")).toBeInTheDocument();
    expect(screen.getByText("Utilities")).toBeInTheDocument();
  });

  it("lists the built practices in the phone's declaration order", () => {
    const { container } = render(<PracticeNav />);
    const order = [
      "/adorations/lunar",
      "/daily-practice/resh",
      "/rituals",
      "/workings",
      "/meditation",
      "/pranayama",
      "/divination/tarot",
      "/gematria",
    ];
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map((a) =>
      a.getAttribute("href"),
    );
    const seen = order.filter((h) => hrefs.includes(h));
    expect(seen).toEqual(order); // present, and in this order
  });

  it("hides a practice the instant it is switched off, keeping the rest", () => {
    const { container } = render(
      <PracticeNav disabledPractices={new Set(["divination"])} />,
    );
    expect(container.querySelector('a[href="/divination/tarot"]')).toBeNull();
    // The others stand.
    expect(container.querySelector('a[href="/adorations/lunar"]')).not.toBeNull();
    expect(container.querySelector('a[href="/gematria"]')).not.toBeNull();
  });

  it("keeps the Practices tier visible with a note when every practice is off", () => {
    render(
      <PracticeNav
        disabledPractices={
          new Set([
            "lunarAdorations",
            "solarAdorations",
            "rituals",
            "workings",
            "meditation",
            "pranayama",
            "divination",
            "numbers",
          ])
        }
      />,
    );
    // The heading stays; the tier says nothing is on rather than vanishing.
    expect(screen.getByText("Practices")).toBeInTheDocument();
    expect(screen.getByText(/no practices switched on/i)).toBeInTheDocument();
  });

  it("shows all built practices when the on/off set is unknown (default-on)", () => {
    const { container } = render(<PracticeNav />);
    for (const href of ["/adorations/lunar", "/daily-practice/resh", "/gematria"]) {
      expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("keeps the journal — the web-only addition Sophia named", () => {
    const { container } = render(<PracticeNav />);
    expect(container.querySelector('a[href="/journal"]')).not.toBeNull();
    expect(screen.getByText("On the web")).toBeInTheDocument();
  });
});

describe("PracticeNav — the platform wing, while it is empty", () => {
  it("⚠ offers no crossing, because there is nothing to cross to", () => {
    render(<PracticeNav />);
    // Every platform link is gated, so the wing is empty. A button that
    // crosses to a blank page reads as a page that failed to load rather
    // than as a wing with nothing in it.
    expect(HAS_PLATFORM_WING).toBe(false);
    expect(screen.queryByRole("button", { name: /^platform$/i })).toBeNull();
    expect(screen.queryByText("Publishing · Network · Plugins")).toBeNull();
  });

  it("a stored platform wing does not strand somebody on an empty page", () => {
    window.sessionStorage.setItem("theourgia.nav.wing", "platform");
    render(<PracticeNav />);
    // ⚠ Whoever was last on the platform wing before the gate landed still
    // has it in session storage. They must not open the app to nothing.
    expect(screen.queryByText("Publishing")).toBeNull();
  });

  it("the trees are INTACT — the gate hides, it does not delete", () => {
    // ⚠ The whole reason unhiding is one line: nothing was removed, so
    // nothing has to be reconstructed.
    const platform = PLATFORM_WING_SECTIONS.flatMap((s) => s.items);
    expect(platform).toHaveLength(14);
    expect(platform.every((i) => HIDDEN_UNTIL_FINISHED.has(i.key))).toBe(true);
  });
});

describe("PracticeNav — active superset contract", () => {
  // ⚠ `ladder` and `awaitingjudgment` were here too and are now gated, so
  // there is no link left to highlight. The KEY contract still holds — the
  // type still accepts them and `wingForKey` still places them — and the
  // highlight returns with the link the day either leaves
  // HIDDEN_UNTIL_FINISHED.
  it.each([
    ["record", "The record"],
    ["lunaradorations", "Lunar adorations"],
  ] as const)("highlights the visible key %s", (key, label) => {
    render(<PracticeNav active={key} />);
    const link = screen.getByText(label).closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
    expect(link.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
  });

  it("a gated key is still a valid key, it just has no link", () => {
    // Somebody arriving at /verdicts by URL must not crash the nav.
    expect(() => render(<PracticeNav active="awaitingjudgment" />)).not.toThrow();
    expect(screen.queryByText("Awaiting judgment")).toBeNull();
  });

  it("still honours the old VaultNav keys (journal)", () => {
    render(<PracticeNav active="journal" />);
    const link = screen.getByText("Journal").closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
  });

  it("wingForKey routes old keys to their wing", () => {
    expect(wingForKey("today")).toBe("practice");
    expect(wingForKey("gematria")).toBe("practice");
    expect(wingForKey("plugins")).toBe("platform");
    expect(wingForKey("icalfeed")).toBe("platform");
    expect(wingForKey(undefined)).toBe("practice");
  });
});

describe("PracticeNav — nothing deleted", () => {
  it("every route reachable from the old VaultNav survives across the two wings", () => {
    const oldRoutes = DEFAULT_VAULT_NAV.flatMap((s) => s.items.map((i) => i.to));
    const newRoutes = new Set(
      [...PRACTICE_WING_SECTIONS, ...PLATFORM_WING_SECTIONS].flatMap((s) => [
        ...s.items.map((i) => i.to),
        ...(s.moreItems ?? []).map((i) => i.to),
      ]),
    );
    for (const route of oldRoutes) {
      expect(newRoutes.has(route), `route ${route} lost in the restructure`).toBe(true);
    }
  });

  it("every old VaultNav key remains addressable via active", () => {
    const oldKeys = DEFAULT_VAULT_NAV.flatMap((s) => s.items.map((i) => i.key));
    const newKeys = new Set(
      [...PRACTICE_WING_SECTIONS, ...PLATFORM_WING_SECTIONS].flatMap((s) => [
        ...s.items.map((i) => i.key),
        ...(s.moreItems ?? []).map((i) => i.key),
      ]),
    );
    for (const key of oldKeys) {
      expect(newKeys.has(key), `key ${key} lost in the restructure`).toBe(true);
    }
  });
});

describe("PracticeNav — awaiting-judgment count", () => {
  it("renders no chip when the count is absent (endpoint not shipped)", () => {
    const { container } = render(<PracticeNav />);
    expect(container.querySelector("[data-judgment-count]")).toBeNull();
  });

  it("renders no chip at zero — an empty queue is silence, not a zero", () => {
    const { container } = render(<PracticeNav awaitingJudgmentCount={0} />);
    expect(container.querySelector("[data-judgment-count]")).toBeNull();
  });

  it("⚠ renders no chip while the link itself is gated", () => {
    const { container } = render(<PracticeNav awaitingJudgmentCount={3} />);
    // The count hangs off the Awaiting-judgment link, and that link is
    // hidden until the feature is finished — so a queue with work in it is
    // silent here rather than pointing at a menu entry that is not there.
    // The chip returns with the link.
    expect(container.querySelector("[data-judgment-count]")).toBeNull();
  });
});

describe("PracticeNav — responsive contract (data-nav-mode)", () => {
  it("defaults to auto so the media queries drive the five breakpoints", () => {
    const { container } = render(<PracticeNav />);
    const aside = container.querySelector("aside.pn-aside");
    expect(aside).not.toBeNull();
    expect(aside).toHaveAttribute("data-nav-mode", "auto");
  });

  it.each(["drawer", "rail", "compact", "full"] as const)(
    "forces %s mode via the attribute for tests and spec surfaces",
    (mode) => {
      const { container } = render(<PracticeNav navMode={mode} />);
      expect(container.querySelector("aside.pn-aside")).toHaveAttribute("data-nav-mode", mode);
    },
  );

  it("wraps every collapsible label in .pn-label so the rail can drop them", () => {
    render(<PracticeNav />);
    const journalLabel = screen.getByText("Journal");
    expect(journalLabel.classList.contains("pn-label")).toBe(true);
    const brand = screen.getByText("Theourgia");
    expect(brand.classList.contains("pn-label")).toBe(true);
  });

  it("keeps an accessible name on every rail item via title", () => {
    render(<PracticeNav />);
    const journalLabel = screen.getByText("Journal");
    const link = journalLabel.closest("a") as HTMLElement;
    const icon = link.querySelector("span[title]");
    expect(icon).toHaveAttribute("title", "Journal");
  });

  it("marks the aside with the current wing for styling hooks", async () => {
    const { container } = render(<PracticeNav />);
    expect(container.querySelector("aside")).toHaveAttribute("data-wing", "practice");
    // ⚠ Driven by the PROP now, not by the switcher — the switcher is gone
    // while the platform wing is empty. The styling hook is what is under
    // test and it still works for either wing.
    expect(container.querySelector("aside")).toHaveAttribute("data-wing", "practice");
  });
});

describe("PracticeNav — chrome callbacks", () => {
  it("fires onNavigate when a link is picked", async () => {
    const onNavigate = vi.fn();
    render(<PracticeNav onNavigate={onNavigate} />);
    await userEvent.setup().click(screen.getByText("Journal"));
    expect(onNavigate).toHaveBeenCalled();
  });

  it("fires onQuickCapture and onSettings", async () => {
    const onQuickCapture = vi.fn();
    const onSettings = vi.fn();
    render(<PracticeNav onQuickCapture={onQuickCapture} onSettings={onSettings} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /quick capture/i }));
    expect(onQuickCapture).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(onSettings).toHaveBeenCalled();
  });

  it("renders the identity foot without a fabricated persona by default", () => {
    render(<PracticeNav />);
    expect(screen.getByText("Practitioner")).toBeInTheDocument();
    expect(screen.getByText("This vault")).toBeInTheDocument();
  });
});
