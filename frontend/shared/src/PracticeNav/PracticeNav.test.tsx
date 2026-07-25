import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_VAULT_NAV } from "../VaultNav/index.js";
import {
  PLATFORM_WING_SECTIONS,
  PRACTICE_WING_SECTIONS,
  PracticeNav,
  wingForKey,
} from "./index.js";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("PracticeNav — practice wing (default)", () => {
  it("renders the four practice sections and no platform sections", () => {
    render(<PracticeNav />);
    for (const heading of ["Practice", "Reference", "Workbench", "Study"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    // "Platform" appears as the switcher's destination label even on the
    // practice wing, so platform-wing absence is checked via its items.
    expect(screen.queryByText("Publications")).toBeNull();
    expect(screen.queryByText("Ritual feed")).toBeNull();
    expect(screen.queryByText("Plugins")).toBeNull();
  });

  it("renders all 17 practice-wing links", () => {
    render(<PracticeNav />);
    const labels = PRACTICE_WING_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toHaveLength(17);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("links the three new surfaces to their H12 routes", () => {
    const { container } = render(<PracticeNav />);
    expect(container.querySelector('a[href="/divination/astragaloi"]')).not.toBeNull();
    expect(container.querySelector('a[href="/order/ladder"]')).not.toBeNull();
    expect(container.querySelector('a[href="/verdicts"]')).not.toBeNull();
  });

  it("keeps 'More tools' collapsed by default and discloses the five tools", async () => {
    const { container } = render(<PracticeNav />);
    expect(screen.queryByText("Magic squares")).toBeNull();
    const more = screen.getByRole("button", { name: /more tools/i });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.setup().click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Fewer tools")).toBeInTheDocument();
    for (const href of [
      "/magic-squares",
      "/voces",
      "/gematria",
      "/transliterations",
      "/voces-library",
    ]) {
      expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
  });

  it("opens 'More tools' on first paint when the active key hides behind it", () => {
    render(<PracticeNav active="gematria" />);
    expect(screen.getByText("Gematria")).toBeInTheDocument();
    const link = screen.getByText("Gematria").closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
  });
});

describe("PracticeNav — wing switcher", () => {
  it("crosses to the platform wing and back, naming the destination", async () => {
    render(<PracticeNav />);
    const user = userEvent.setup();
    const toPlatform = screen.getByRole("button", { name: /^platform$/i });
    expect(screen.getByText("Publishing · Network · Plugins")).toBeInTheDocument();
    await user.click(toPlatform);
    for (const heading of ["Publishing", "Network", "Platform"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
    expect(screen.queryByText("Workbench")).toBeNull();
    const back = screen.getByRole("button", { name: /back to practice/i });
    expect(screen.getByText("Today · Journal · Workbench")).toBeInTheDocument();
    await user.click(back);
    expect(screen.getByText("Workbench")).toBeInTheDocument();
  });

  it("renders all 14 platform-wing links (6 publishing / 4 network / 4 platform)", async () => {
    render(<PracticeNav />);
    await userEvent.setup().click(screen.getByRole("button", { name: /^platform$/i }));
    const labels = PLATFORM_WING_SECTIONS.flatMap((s) => s.items.map((i) => i.label));
    expect(labels).toHaveLength(14);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("fires onWingChange and persists the wing per session", async () => {
    const onWingChange = vi.fn();
    render(<PracticeNav onWingChange={onWingChange} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /^platform$/i }));
    expect(onWingChange).toHaveBeenCalledWith("platform");
    expect(window.sessionStorage.getItem("theourgia.nav.wing")).toBe("platform");
  });

  it("restores the stored wing on a fresh mount (no active key)", () => {
    window.sessionStorage.setItem("theourgia.nav.wing", "platform");
    render(<PracticeNav />);
    expect(screen.getByText("Publishing")).toBeInTheDocument();
  });

  it("follows a platform-wing active key so the highlight is never invisible", () => {
    render(<PracticeNav active="plugins" />);
    expect(screen.getByText("Plugins")).toBeInTheDocument();
    const link = screen.getByText("Plugins").closest("a") as HTMLElement;
    expect(link.style.background).toBe("var(--accent-soft)");
  });
});

describe("PracticeNav — active superset contract", () => {
  it.each(["astragaloi", "ladder", "awaitingjudgment"] as const)(
    "highlights the new H12 key %s",
    (key) => {
      render(<PracticeNav active={key} />);
      const labelByKey = {
        astragaloi: "Astragaloi",
        ladder: "Tetraktys ladder",
        awaitingjudgment: "Awaiting judgment",
      } as const;
      const link = screen.getByText(labelByKey[key]).closest("a") as HTMLElement;
      expect(link.style.background).toBe("var(--accent-soft)");
      expect(link.style.boxShadow).toBe("inset 2px 0 0 var(--accent)");
    },
  );

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

  it("renders the quiet count when the queue holds work", () => {
    const { container } = render(<PracticeNav awaitingJudgmentCount={3} />);
    const chip = container.querySelector("[data-judgment-count]");
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe("3");
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
    await userEvent.setup().click(screen.getByRole("button", { name: /^platform$/i }));
    expect(container.querySelector("aside")).toHaveAttribute("data-wing", "platform");
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
