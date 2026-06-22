import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  CUSTOM_NOTE,
  MS_TOPBAR_SUBTITLE,
  MS_TOPBAR_TITLE,
  PLANETARY_CITATION,
  RAIL_EMPTY_CUSTOM,
} from "./copy.js";
import { MagicSquaresSurface } from "./MagicSquaresSurface.js";
import { PlanetaryRail } from "./PlanetaryRail.js";
import { SquareView } from "./SquareView.js";

// ─── Editorial copy ──────────────────────────────────────────────

describe("MagicSquares editorial constants", () => {
  it("MS_TOPBAR_TITLE is 'Magic Squares'", () => {
    expect(MS_TOPBAR_TITLE).toBe("Magic Squares");
  });

  it("MS_TOPBAR_SUBTITLE is verbatim from the mockup", () => {
    expect(MS_TOPBAR_SUBTITLE).toBe(
      "The seven planetary kamea, and squares of your own",
    );
  });

  it("PLANETARY_CITATION is the verbatim Agrippa 1531 line", () => {
    expect(PLANETARY_CITATION).toBe(
      "Cornelius Agrippa, De Occulta Philosophia II.22, 1531",
    );
  });

  it("CUSTOM_NOTE makes the no-citation promise verbatim", () => {
    expect(CUSTOM_NOTE).toBe(
      "Your square — the source is you; no citation is carried.",
    );
  });

  it("RAIL_EMPTY_CUSTOM is the verbatim empty-state CTA", () => {
    expect(RAIL_EMPTY_CUSTOM).toBe(
      "Build a square of your own — pick an order below.",
    );
  });
});

// ─── PlanetaryRail ───────────────────────────────────────────────

describe("PlanetaryRail", () => {
  it("renders all 7 planetary buttons in sacred order", () => {
    render(
      <PlanetaryRail
        value="saturn"
        customValue={null}
        customSquares={[]}
        onPick={() => {}}
        onNew={() => {}}
      />,
    );
    const buttons = document.querySelectorAll("[data-square]");
    expect(
      Array.from(buttons).map((b) => b.getAttribute("data-square")),
    ).toEqual([
      "saturn",
      "jupiter",
      "mars",
      "sun",
      "venus",
      "mercury",
      "moon",
    ]);
  });

  it("highlights the active planet", () => {
    render(
      <PlanetaryRail
        value="mars"
        customValue={null}
        customSquares={[]}
        onPick={() => {}}
        onNew={() => {}}
      />,
    );
    const mars = document.querySelector("[data-square='mars']");
    expect(mars).toHaveAttribute("aria-pressed", "true");
  });

  it("empty custom list shows the verbatim CTA copy", () => {
    render(
      <PlanetaryRail
        value="saturn"
        customValue={null}
        customSquares={[]}
        onPick={() => {}}
        onNew={() => {}}
      />,
    );
    expect(screen.getByText(RAIL_EMPTY_CUSTOM)).toBeInTheDocument();
  });

  it("custom squares list renders each entry with order", () => {
    render(
      <PlanetaryRail
        value="saturn"
        customValue={null}
        customSquares={[
          { id: "x", name: "Square of binding", order: 5 },
        ]}
        onPick={() => {}}
        onNew={() => {}}
      />,
    );
    const row = document.querySelector("[data-custom-square='x']");
    expect(row).toBeTruthy();
    expect(row?.textContent).toContain("Square of binding");
    expect(row?.textContent).toContain("5");
  });

  it("clicking a planet fires onPick with the planet id", () => {
    const onPick = vi.fn();
    render(
      <PlanetaryRail
        value="saturn"
        customValue={null}
        customSquares={[]}
        onPick={onPick}
        onNew={() => {}}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-square='moon']") as Element,
    );
    expect(onPick).toHaveBeenCalledWith("moon");
  });

  it("New custom square button fires onNew", () => {
    const onNew = vi.fn();
    render(
      <PlanetaryRail
        value="saturn"
        customValue={null}
        customSquares={[]}
        onPick={() => {}}
        onNew={onNew}
      />,
    );
    fireEvent.click(
      document.querySelector(
        "[data-action='new-custom-square']",
      ) as Element,
    );
    expect(onNew).toHaveBeenCalled();
  });
});

// ─── SquareView ──────────────────────────────────────────────────

describe("SquareView", () => {
  const saturn = [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ];

  it("renders n² cells", () => {
    render(<SquareView cells={saturn} order={3} mode="view" />);
    expect(
      document.querySelectorAll("[data-cell-index]"),
    ).toHaveLength(9);
  });

  it("View mode renders the traditional planet sigil overlay", () => {
    render(<SquareView cells={saturn} order={3} mode="view" />);
    expect(
      document.querySelector("[data-planet-overlay]"),
    ).toBeTruthy();
    // Trace polyline should NOT be present in View mode.
    expect(document.querySelector("[data-user-trace]")).toBeFalsy();
  });

  it("Trace mode shows the user trace polyline", () => {
    render(
      <SquareView
        cells={saturn}
        order={3}
        mode="trace"
        trace={[0, 1, 4]}
      />,
    );
    expect(document.querySelector("[data-user-trace]")).toBeTruthy();
    expect(document.querySelector("[data-planet-overlay]")).toBeFalsy();
  });

  it("Build mode with cells=null renders editable inputs", () => {
    render(<SquareView cells={null} order={4} mode="build" />);
    const inputs = document.querySelectorAll(
      "[data-build-cell-index]",
    );
    expect(inputs).toHaveLength(16);
  });

  it("clicking a cell in Trace mode fires onAppendTrace", () => {
    const onAppendTrace = vi.fn();
    render(
      <SquareView
        cells={saturn}
        order={3}
        mode="trace"
        onAppendTrace={onAppendTrace}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-cell-index='0']") as Element,
    );
    expect(onAppendTrace).toHaveBeenCalledWith(0);
  });

  it("clicking a cell in View mode fires onSelectCell", () => {
    const onSelectCell = vi.fn();
    render(
      <SquareView
        cells={saturn}
        order={3}
        mode="view"
        onSelectCell={onSelectCell}
      />,
    );
    fireEvent.click(
      document.querySelector("[data-cell-index='4']") as Element,
    );
    expect(onSelectCell).toHaveBeenCalledWith(4);
  });
});

// ─── MagicSquaresSurface ────────────────────────────────────────

describe("MagicSquaresSurface", () => {
  it("defaults to Saturn / view mode", () => {
    render(<MagicSquaresSurface />);
    const surface = document.querySelector(
      "[data-component='magic-squares-surface']",
    );
    expect(surface).toHaveAttribute("data-square", "saturn");
    expect(surface).toHaveAttribute("data-mode", "view");
  });

  it("Saturn renders the verbatim Agrippa citation", () => {
    render(<MagicSquaresSurface />);
    expect(document.querySelector("[data-citation]")).toBeTruthy();
    expect(screen.getByText(PLANETARY_CITATION)).toBeInTheDocument();
  });

  it("custom square swaps citation for the 'source is you' note", () => {
    render(
      <MagicSquaresSurface
        initialSquare="custom"
        initialCustomId="demo-binding"
      />,
    );
    expect(document.querySelector("[data-citation]")).toBeFalsy();
    expect(document.querySelector("[data-custom-note]")).toBeTruthy();
    expect(screen.getByText(CUSTOM_NOTE)).toBeInTheDocument();
  });

  it("Build button is disabled when a planetary square is active", () => {
    render(<MagicSquaresSurface />);
    const build = document.querySelector(
      "[data-mode-button='build']",
    ) as HTMLButtonElement;
    expect(build).toBeDisabled();
  });

  it("Build button is enabled when a custom square is active", () => {
    render(
      <MagicSquaresSurface
        initialSquare="custom"
        initialCustomId="demo-binding"
      />,
    );
    const build = document.querySelector(
      "[data-mode-button='build']",
    ) as HTMLButtonElement;
    expect(build).not.toBeDisabled();
  });

  it("switching to Trace mode shows Save-as-sigil + Reset trace", () => {
    render(<MagicSquaresSurface />);
    fireEvent.click(
      document.querySelector("[data-mode-button='trace']") as Element,
    );
    expect(
      document.querySelector("[data-action='save-as-sigil']"),
    ).toBeTruthy();
    expect(
      document.querySelector("[data-action='reset-trace']"),
    ).toBeTruthy();
  });

  it("Save as sigil fires onSaveAsSigil with the picked cell values", () => {
    const onSaveAsSigil = vi.fn();
    render(<MagicSquaresSurface onSaveAsSigil={onSaveAsSigil} />);
    fireEvent.click(
      document.querySelector("[data-mode-button='trace']") as Element,
    );
    // Pick two cells (Saturn 3×3 — values 4 and 9).
    fireEvent.click(
      document.querySelector("[data-cell-index='0']") as Element,
    );
    fireEvent.click(
      document.querySelector("[data-cell-index='1']") as Element,
    );
    fireEvent.click(
      document.querySelector(
        "[data-action='save-as-sigil']",
      ) as Element,
    );
    expect(onSaveAsSigil).toHaveBeenCalledTimes(1);
    expect(onSaveAsSigil.mock.calls[0]![0].squareId).toBe("saturn");
    expect(onSaveAsSigil.mock.calls[0]![0].cellSequence).toEqual([4, 9]);
  });

  it("picking a planet resets trace + selection", () => {
    render(<MagicSquaresSurface />);
    fireEvent.click(
      document.querySelector("[data-mode-button='trace']") as Element,
    );
    fireEvent.click(
      document.querySelector("[data-cell-index='0']") as Element,
    );
    fireEvent.click(
      document.querySelector("[data-square='moon']") as Element,
    );
    const surface = document.querySelector(
      "[data-component='magic-squares-surface']",
    );
    expect(surface).toHaveAttribute("data-square", "moon");
    expect(surface).toHaveAttribute("data-mode", "view");
  });

  it("Mars renders order=5 + magic constant 65", () => {
    render(<MagicSquaresSurface initialSquare="mars" />);
    expect(screen.getByText("65")).toBeInTheDocument();
    const heading = document.querySelector("[data-square-name]");
    expect(heading?.textContent).toBe("Mars");
  });

  it("Sun renders the fixture (order=6, magic constant 111)", () => {
    render(<MagicSquaresSurface initialSquare="sun" />);
    expect(screen.getByText("111")).toBeInTheDocument();
    const heading = document.querySelector("[data-square-name]");
    expect(heading?.textContent).toBe("Sun");
  });

  it("uses zero --danger anywhere", () => {
    const { container } = render(<MagicSquaresSurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});
