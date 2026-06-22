import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { AltarsList } from "./AltarsList.js";
import {
  DEMO_ALTARS,
  DEMO_TOOLS,
  TOOL_KINDS,
  TR_CONSECRATION_HONESTY_NOTE,
  TR_NOT_YET_CONSECRATED,
  TR_TOPBAR_SUBTITLE,
  TR_TOPBAR_TITLE,
  TR_USE_HISTORY_READONLY_PILL,
} from "./copy.js";
import { ToolCard } from "./ToolCard.js";
import { ToolDetailDrawer } from "./ToolDetailDrawer.js";
import { ToolKindIcon } from "./ToolKindIcon.js";
import { ToolRegistrySurface } from "./ToolRegistrySurface.js";

// ─── Editorial copy ──────────────────────────────────────────────

describe("ToolRegistry editorial constants", () => {
  it("TR_TOPBAR_TITLE is verbatim", () => {
    expect(TR_TOPBAR_TITLE).toBe("Tool Registry");
  });

  it("TR_TOPBAR_SUBTITLE is verbatim", () => {
    expect(TR_TOPBAR_SUBTITLE).toBe(
      "Your ritual implements and the altars they keep",
    );
  });

  it("TR_CONSECRATION_HONESTY_NOTE is the load-bearing verbatim copy", () => {
    expect(TR_CONSECRATION_HONESTY_NOTE).toBe(
      "Status follows the record — a tool is consecrated by linking the working where it happened, never by a switch.",
    );
  });

  it("TOOL_KINDS lists exactly 14 entries (no 'all' in the data)", () => {
    expect(TOOL_KINDS).toHaveLength(14);
    expect(TOOL_KINDS[0]!.key).toBe("wand");
    expect(TOOL_KINDS[13]!.key).toBe("other");
  });

  it("DEMO_TOOLS includes some consecrated and some not", () => {
    const consecrated = DEMO_TOOLS.filter((t) => t.consDate != null);
    const pending = DEMO_TOOLS.filter((t) => t.consDate == null);
    expect(consecrated.length).toBeGreaterThan(0);
    expect(pending.length).toBeGreaterThan(0);
  });
});

// ─── ToolKindIcon ────────────────────────────────────────────────

describe("ToolKindIcon", () => {
  it("renders for each of the 14 kinds", () => {
    for (const def of TOOL_KINDS) {
      const { container } = render(<ToolKindIcon kind={def.key} />);
      expect(
        container.querySelector(`[data-tool-kind='${def.key}']`),
      ).toBeTruthy();
    }
  });

  it("respects size prop", () => {
    const { container } = render(<ToolKindIcon kind="wand" size={64} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "64");
    expect(svg).toHaveAttribute("height", "64");
  });
});

// ─── ToolCard ────────────────────────────────────────────────────

describe("ToolCard", () => {
  const consecrated = DEMO_TOOLS.find((t) => t.consDate != null)!;
  const pending = DEMO_TOOLS.find((t) => t.consDate == null)!;

  it("consecrated card shows --care palette pill + checkmark", () => {
    render(<ToolCard tool={consecrated} />);
    const pill = document.querySelector("[data-pill='consecrated']");
    expect(pill).toBeTruthy();
    const html = pill!.outerHTML;
    expect(html).toContain("var(--care");
    expect(html).not.toContain("--danger");
  });

  it("pending card shows muted 'Not yet consecrated' pill", () => {
    render(<ToolCard tool={pending} />);
    const pill = document.querySelector("[data-pill='pending']");
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe(TR_NOT_YET_CONSECRATED);
  });

  it("clicking the card fires onOpen with the id", () => {
    const onOpen = vi.fn();
    render(<ToolCard tool={consecrated} onOpen={onOpen} />);
    fireEvent.click(
      document.querySelector(
        `[data-tool-card='${consecrated.id}']`,
      ) as Element,
    );
    expect(onOpen).toHaveBeenCalledWith(consecrated.id);
  });
});

// ─── ToolDetailDrawer ────────────────────────────────────────────

describe("ToolDetailDrawer", () => {
  const consecrated = DEMO_TOOLS.find((t) => t.consDate != null)!;
  const pending = DEMO_TOOLS.find((t) => t.consDate == null)!;

  it("does not render when closed", () => {
    render(
      <ToolDetailDrawer
        open={false}
        tool={consecrated}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders all 7 sections + the read-only use-history pill", () => {
    render(
      <ToolDetailDrawer
        open
        tool={consecrated}
        onClose={() => {}}
      />,
    );
    for (const section of [
      "photos",
      "identity",
      "materials",
      "provenance",
      "consecration",
      "use-history",
      "location",
    ]) {
      expect(
        document.querySelector(`[data-section='${section}']`),
      ).toBeTruthy();
    }
    const readOnly = document.querySelector("[data-readonly-pill]");
    expect(readOnly?.textContent).toBe(TR_USE_HISTORY_READONLY_PILL);
  });

  it("consecrated tool renders the consecration line + working link", () => {
    render(
      <ToolDetailDrawer open tool={consecrated} onClose={() => {}} />,
    );
    expect(
      document.querySelector("[data-consecrated-line]"),
    ).toBeTruthy();
    expect(screen.getByText(consecrated.consWorking!)).toBeInTheDocument();
  });

  it("pending tool surfaces the verbatim honesty note + Link CTA", () => {
    render(<ToolDetailDrawer open tool={pending} onClose={() => {}} />);
    expect(
      screen.getByText(TR_CONSECRATION_HONESTY_NOTE),
    ).toBeInTheDocument();
    expect(
      document.querySelector("[data-action='link-consecration']"),
    ).toBeTruthy();
  });

  it("Link CTA fires onLinkConsecration with the tool id", () => {
    const onLink = vi.fn();
    render(
      <ToolDetailDrawer
        open
        tool={pending}
        onClose={() => {}}
        onLinkConsecration={onLink}
      />,
    );
    fireEvent.click(
      document.querySelector(
        "[data-action='link-consecration']",
      ) as Element,
    );
    expect(onLink).toHaveBeenCalledWith(pending.id);
  });

  it("close button fires onClose", () => {
    const onClose = vi.fn();
    render(
      <ToolDetailDrawer open tool={consecrated} onClose={onClose} />,
    );
    fireEvent.click(
      document.querySelector("[data-action='close']") as Element,
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("zero --danger anywhere in the drawer", () => {
    const { container } = render(
      <ToolDetailDrawer open tool={consecrated} onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("zero --danger anywhere in the pending drawer", () => {
    const { container } = render(
      <ToolDetailDrawer open tool={pending} onClose={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── AltarsList ──────────────────────────────────────────────────

describe("AltarsList", () => {
  it("renders 2 demo altars by default", () => {
    render(<AltarsList />);
    expect(
      document.querySelectorAll("[data-altar-row]"),
    ).toHaveLength(2);
  });

  it("permanent altar shows the --care 'permanent' pill", () => {
    render(<AltarsList />);
    const pill = document.querySelector("[data-pill='permanent']");
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toBe("permanent");
  });

  it("clicking an altar fires onOpen", () => {
    const onOpen = vi.fn();
    render(<AltarsList onOpen={onOpen} />);
    fireEvent.click(
      document.querySelector(
        `[data-altar-row='${DEMO_ALTARS[0]!.id}']`,
      ) as Element,
    );
    expect(onOpen).toHaveBeenCalledWith(DEMO_ALTARS[0]!.id);
  });
});

// ─── ToolRegistrySurface ─────────────────────────────────────────

describe("ToolRegistrySurface", () => {
  it("defaults to tools view + kind=all", () => {
    render(<ToolRegistrySurface />);
    const surface = document.querySelector(
      "[data-component='tool-registry-surface']",
    );
    expect(surface).toHaveAttribute("data-view", "tools");
    expect(surface).toHaveAttribute("data-kind-filter", "all");
  });

  it("renders all 8 demo tools by default", () => {
    render(<ToolRegistrySurface />);
    expect(
      document.querySelectorAll("[data-tool-card]"),
    ).toHaveLength(8);
  });

  it("kind filter narrows the grid", () => {
    render(<ToolRegistrySurface />);
    fireEvent.click(
      document.querySelector("[data-kind-filter='wand']") as Element,
    );
    const cards = document.querySelectorAll("[data-tool-card]");
    expect(cards.length).toBe(1);
    expect(cards[0]).toHaveAttribute(
      "data-tool-card",
      "wand-olive",
    );
  });

  it("Altars view hides the kind filter buttons + shows altar rows", () => {
    render(<ToolRegistrySurface />);
    fireEvent.click(
      document.querySelector("[data-view-button='altars']") as Element,
    );
    // The chip-row "All" button is the one with role=button (the surface
    // itself carries data-kind-filter as state). Check the buttons.
    expect(
      document.querySelector("button[data-kind-filter='all']"),
    ).toBeFalsy();
    expect(
      document.querySelectorAll("[data-altar-row]"),
    ).toHaveLength(2);
  });

  it("clicking a tool card opens the drawer", () => {
    render(<ToolRegistrySurface />);
    fireEvent.click(
      document.querySelector(
        "[data-tool-card='athame-hekate']",
      ) as Element,
    );
    expect(
      screen.getByRole("dialog", { name: /Tool detail/i }),
    ).toBeInTheDocument();
  });

  it("search input narrows tools by name OR description", () => {
    render(<ToolRegistrySurface />);
    const search = document.querySelector(
      "[data-search-input]",
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: "olive" } });
    expect(
      document.querySelectorAll("[data-tool-card]"),
    ).toHaveLength(1);
  });

  it("New tool button fires onNew with the active view", () => {
    const onNew = vi.fn();
    render(<ToolRegistrySurface onNew={onNew} />);
    fireEvent.click(
      document.querySelector("[data-action='new']") as Element,
    );
    expect(onNew).toHaveBeenCalledWith("tools");
  });

  it("zero --danger anywhere", () => {
    const { container } = render(<ToolRegistrySurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
