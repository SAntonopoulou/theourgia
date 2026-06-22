import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  drawRunes,
  findRune,
} from "../divination/index.js";
import {
  RUNES_CITATION,
  RUNES_DRAW_LABEL,
  RUNES_MERKSTAVE_PILL,
  RUNES_SIZE_OPTIONS,
  RUNES_SYMMETRIC_NOTE,
} from "./copy.js";
import { RuneBoard } from "./RuneBoard.js";
import { RuneReadingRail } from "./RuneReadingRail.js";
import { RuneSizePicker } from "./RuneSizePicker.js";
import { RuneTile } from "./RuneTile.js";
import { RunesSurface } from "./RunesSurface.js";

// ─── copy ─────────────────────────────────────────────────────────

describe("Runes editorial constants", () => {
  it("RUNES_SYMMETRIC_NOTE is verbatim from the mockup", () => {
    expect(RUNES_SYMMETRIC_NOTE).toBe(
      "A symmetric stave — it reads the same upright or turned. It has no merkstave; none is shown.",
    );
  });

  it("RUNES_CITATION cites the rune poems", () => {
    expect(RUNES_CITATION).toContain("Old English");
    expect(RUNES_CITATION).toContain("Norwegian");
    expect(RUNES_CITATION).toContain("public domain");
  });

  it("RUNES_SIZE_OPTIONS lists three draw sizes", () => {
    expect(RUNES_SIZE_OPTIONS.map((o) => o.key)).toEqual([1, 3, 5]);
  });

  it("RUNES_MERKSTAVE_PILL says 'Merkstave (reversed)'", () => {
    expect(RUNES_MERKSTAVE_PILL).toBe("Merkstave (reversed)");
  });
});

// ─── RuneTile ────────────────────────────────────────────────────

describe("RuneTile", () => {
  it("renders glyph + name", () => {
    render(<RuneTile rune={findRune("Fehu")} />);
    expect(screen.getByText("ᚠ")).toBeInTheDocument();
    expect(screen.getByText("Fehu")).toBeInTheDocument();
  });

  it("merkstave → glyph rotated 180° + ⟲ corner", () => {
    const { container } = render(
      <RuneTile rune={findRune("Fehu")} merkstave />,
    );
    expect(
      container.querySelector("[data-merkstave-indicator]"),
    ).not.toBeNull();
    expect(
      container.firstElementChild?.getAttribute("data-merkstave"),
    ).toBe("true");
  });

  it("symmetric stave with merkstave=false (never paired)", () => {
    const { container } = render(
      <RuneTile rune={findRune("Gebo")} merkstave={false} />,
    );
    expect(
      container.firstElementChild?.getAttribute("data-symmetric"),
    ).toBe("true");
    expect(
      container.querySelector("[data-merkstave-indicator]"),
    ).toBeNull();
  });

  it("selected → accent border + aria-pressed=true", () => {
    const { container } = render(
      <RuneTile rune={findRune("Sowilo")} selected />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.style.borderColor).toBe("var(--accent)");
  });

  it("aria-label embeds position + rune name + (merkstave) when applicable", () => {
    render(
      <RuneTile
        rune={findRune("Fehu")}
        positionLabel="Urðr — what was"
        merkstave
      />,
    );
    expect(
      screen.getByRole("button", { name: /Urðr — what was: Fehu \(merkstave\)/ }),
    ).toBeInTheDocument();
  });

  it("never uses --danger for merkstave or symmetric staves", () => {
    const { container: a } = render(
      <RuneTile rune={findRune("Hagalaz")} />,
    );
    const { container: b } = render(
      <RuneTile rune={findRune("Nauthiz")} merkstave />,
    );
    expect(a.innerHTML).not.toContain("--danger");
    expect(b.innerHTML).not.toContain("--danger");
  });
});

// ─── RuneSizePicker ─────────────────────────────────────────────

describe("RuneSizePicker", () => {
  it("renders three chips with the canonical labels", () => {
    render(<RuneSizePicker value={3} onChange={() => {}} />);
    expect(screen.getByText("Single stave")).toBeInTheDocument();
    expect(screen.getByText("Three Norns")).toBeInTheDocument();
    expect(screen.getByText("Five-stave cross")).toBeInTheDocument();
  });

  it("active chip carries aria-pressed=true + accent border", () => {
    const { container } = render(
      <RuneSizePicker value={5} onChange={() => {}} />,
    );
    const cross = container.querySelector(
      '[data-size="5"]',
    ) as HTMLElement;
    expect(cross.getAttribute("aria-pressed")).toBe("true");
    expect(cross.style.borderColor).toBe("var(--accent)");
  });

  it("fires onChange with the picked size", () => {
    const onChange = vi.fn();
    render(<RuneSizePicker value={3} onChange={onChange} />);
    fireEvent.click(screen.getByText("Five-stave cross"));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

// ─── RuneBoard ──────────────────────────────────────────────────

describe("RuneBoard", () => {
  it("size=3 renders the three Norns tiles", () => {
    const draw = drawRunes(3, 4);
    const { container } = render(
      <RuneBoard size={3} drawn={draw} selected={1} />,
    );
    const tiles = container.querySelectorAll(
      '[data-component="rune-tile"]',
    );
    expect(tiles).toHaveLength(3);
    expect(tiles[1]?.getAttribute("data-selected")).toBe("true");
  });

  it("size=5 renders five tiles in cross layout", () => {
    const draw = drawRunes(5, 4);
    const { container } = render(
      <RuneBoard size={5} drawn={draw} selected={0} />,
    );
    expect(
      container.querySelectorAll('[data-component="rune-tile"]'),
    ).toHaveLength(5);
  });

  it("empty state when drawn is null", () => {
    const { container } = render(<RuneBoard size={3} drawn={null} />);
    expect(
      container.firstElementChild?.getAttribute("data-state"),
    ).toBe("empty");
    expect(
      container.querySelectorAll('[data-component="rune-tile"]'),
    ).toHaveLength(0);
  });

  it("onSelect fires with the position index", () => {
    const draw = drawRunes(3, 4);
    const onSelect = vi.fn();
    render(
      <RuneBoard size={3} drawn={draw} onSelect={onSelect} />,
    );
    const tiles = screen.getAllByRole("button");
    fireEvent.click(tiles[2]!);
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

// ─── RuneReadingRail ────────────────────────────────────────────

describe("RuneReadingRail", () => {
  it("empty state when drawn is null", () => {
    const { container } = render(<RuneReadingRail drawn={null} />);
    expect(
      container.firstElementChild?.getAttribute("data-state"),
    ).toBe("ready");
    expect(screen.getByText("ᚠ")).toBeInTheDocument();
  });

  it("drawn state — renders glyph + name + protoGermanic + keyword", () => {
    const fehu = findRune("Fehu");
    render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: fehu,
          merkstave: false,
        }}
      />,
    );
    expect(screen.getByText("The stave")).toBeInTheDocument();
    expect(screen.getByText("Fehu")).toBeInTheDocument();
    expect(
      screen.getByText(/\*fehu · wealth/),
    ).toBeInTheDocument();
  });

  it("merkstave pill shown when merkstave=true", () => {
    const fehu = findRune("Fehu");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: fehu,
          merkstave: true,
        }}
      />,
    );
    expect(
      container.querySelector("[data-merkstave-pill]"),
    ).not.toBeNull();
    expect(screen.getByText(RUNES_MERKSTAVE_PILL)).toBeInTheDocument();
  });

  it("symmetric stave NEVER shows merkstave pill, ALWAYS shows symmetric callout (§S3.5)", () => {
    const gebo = findRune("Gebo");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: gebo,
          merkstave: false, // engine forbids true for symmetric staves
        }}
      />,
    );
    expect(
      container.querySelector("[data-merkstave-pill]"),
    ).toBeNull();
    expect(
      container.querySelector("[data-symmetric-callout]"),
    ).not.toBeNull();
    expect(screen.getByText(RUNES_SYMMETRIC_NOTE)).toBeInTheDocument();
  });

  it("merkstave reading uses the rune's merkstave text", () => {
    const fehu = findRune("Fehu");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: fehu,
          merkstave: true,
        }}
      />,
    );
    const reading = container.querySelector("[data-reading-text]");
    expect(reading?.textContent).toContain(fehu.merkstave);
  });

  it("upright reading uses the rune's upright text", () => {
    const fehu = findRune("Fehu");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "The stave",
          rune: fehu,
          merkstave: false,
        }}
      />,
    );
    const reading = container.querySelector("[data-reading-text]");
    expect(reading?.textContent).toContain(fehu.upright);
  });

  it("citation chrome cites the rune poems", () => {
    const fehu = findRune("Fehu");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "x",
          rune: fehu,
          merkstave: false,
        }}
      />,
    );
    const citation = container.querySelector("[data-citation]");
    expect(citation?.textContent).toContain("Old English");
    expect(citation?.textContent).toContain("primary");
  });

  it("textarea placeholder is the verbatim prompt", () => {
    const fehu = findRune("Fehu");
    render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "x",
          rune: fehu,
          merkstave: false,
        }}
      />,
    );
    expect(
      screen.getByPlaceholderText("What this stave says to you, here, now…"),
    ).toBeInTheDocument();
  });

  it("never uses --danger", () => {
    const nauthiz = findRune("Nauthiz");
    const { container } = render(
      <RuneReadingRail
        drawn={{
          position: 0,
          positionLabel: "x",
          rune: nauthiz,
          merkstave: true,
        }}
      />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── RunesSurface ───────────────────────────────────────────────

describe("RunesSurface", () => {
  it("initial state: size=3, default question, Draw button visible", () => {
    const { container } = render(<RunesSurface />);
    expect(screen.getByText(RUNES_DRAW_LABEL)).toBeInTheDocument();
    // The chip carries data-size="3" + aria-pressed="true".
    const three = container.querySelector(
      '[data-size="3"]',
    ) as HTMLElement;
    expect(three?.getAttribute("aria-pressed")).toBe("true");
  });

  it("Draw button re-seeds; selection resets to 0", () => {
    const { container } = render(<RunesSurface />);
    const firstSelected = container.querySelector(
      '[data-component="rune-tile"][data-selected="true"]',
    );
    const firstName = firstSelected?.getAttribute("data-rune-name");
    fireEvent.click(screen.getByText(RUNES_DRAW_LABEL));
    const afterSelected = container.querySelector(
      '[data-component="rune-tile"][data-selected="true"]',
    );
    expect(afterSelected?.getAttribute("data-rune-name")).not.toBe(
      firstName,
    );
  });

  it("changing size to 5 resets selection to 0", () => {
    const { container } = render(<RunesSurface />);
    // Click the size-5 picker chip specifically (not the eyebrow).
    fireEvent.click(
      container.querySelector('[data-size="5"]') as HTMLElement,
    );
    // Position 0 of size=5 is "The matter"
    expect(screen.getByText("The matter")).toBeInTheDocument();
  });

  it("clicking a board tile updates the rail's position eyebrow", () => {
    const { container } = render(<RunesSurface />);
    const tiles = container.querySelectorAll(
      '[data-component="rune-tile"]',
    );
    fireEvent.click(tiles[2]!);
    expect(
      screen.getByText("Skuld — what shall be"),
    ).toBeInTheDocument();
  });

  it("Save button fires onSave with a title", () => {
    const onSave = vi.fn();
    render(<RunesSurface onSave={onSave} />);
    fireEvent.click(screen.getByText("Save draw to journal"));
    expect(onSave).toHaveBeenCalledWith(
      expect.stringMatching(/^Runes — /),
    );
  });

  it("Edit question button fires onEditQuestion", () => {
    const onEditQuestion = vi.fn();
    render(<RunesSurface onEditQuestion={onEditQuestion} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEditQuestion).toHaveBeenCalled();
  });

  it("never uses --danger", () => {
    const { container } = render(<RunesSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
