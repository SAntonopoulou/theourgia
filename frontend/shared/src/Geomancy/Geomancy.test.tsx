import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  type GeoFigure,
  deriveShield,
} from "../divination/index.js";
import {
  DEFAULT_MOTHERS,
  HOUSE_TOPICS,
  HOUSES_EYEBROW,
  HOUSES_FOOTNOTE,
  SHIELD_EYEBROW,
} from "./copy.js";
import { GeoFigureView } from "./GeoFigureView.js";
import { GeoHouseChart } from "./GeoHouseChart.js";
import { GeoShield } from "./GeoShield.js";
import { GeoVerdict } from "./GeoVerdict.js";
import { GeomancySurface } from "./GeomancySurface.js";
import { MotherCell } from "./MotherCell.js";

const sampleMothers: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
  ...DEFAULT_MOTHERS,
] as [GeoFigure, GeoFigure, GeoFigure, GeoFigure];
const sampleShield = deriveShield(sampleMothers);

// ─── copy ─────────────────────────────────────────────────────────

describe("Geomancy editorial constants", () => {
  it("HOUSE_TOPICS lists 12 traditional house topics in canonical order", () => {
    expect(HOUSE_TOPICS).toHaveLength(12);
    expect(HOUSE_TOPICS[0]).toBe("the querent");
    expect(HOUSE_TOPICS[9]).toBe("calling");
    expect(HOUSE_TOPICS[11]).toBe("the hidden");
  });

  it("HOUSES_FOOTNOTE mirrors the mockup verbatim", () => {
    expect(HOUSES_FOOTNOTE).toContain("Houses run I–XII around the frame");
    expect(HOUSES_FOOTNOTE).toContain("Select a house");
  });

  it("DEFAULT_MOTHERS matches the mockup state exactly", () => {
    expect(DEFAULT_MOTHERS).toEqual([
      [1, 2, 1, 1],
      [2, 1, 1, 2],
      [1, 1, 2, 2],
      [2, 2, 1, 1],
    ]);
  });
});

// ─── GeoFigureView ───────────────────────────────────────────────

describe("GeoFigureView", () => {
  it("renders four rows", () => {
    const { container } = render(
      <GeoFigureView figure={[1, 2, 1, 2]} />,
    );
    expect(container.querySelectorAll("[data-line-index]")).toHaveLength(4);
  });

  it("single point line renders one pip; double renders two", () => {
    const { container } = render(
      <GeoFigureView figure={[1, 2, 1, 2]} />,
    );
    const lines = container.querySelectorAll("[data-line-index]");
    expect(lines[0]?.childElementCount).toBe(1);
    expect(lines[1]?.childElementCount).toBe(2);
  });

  it("respects custom dotSize + color", () => {
    const { container } = render(
      <GeoFigureView figure={[1, 1, 1, 1]} dotSize={6} color="var(--accent)" />,
    );
    const firstPip = container.querySelector(
      "[data-line-index='0'] > span",
    ) as HTMLElement;
    expect(firstPip.style.width).toBe("6px");
    expect(firstPip.style.background).toBe("var(--accent)");
  });
});

// ─── MotherCell ──────────────────────────────────────────────────

describe("MotherCell", () => {
  it("renders the Mother N eyebrow + figure name", () => {
    render(<MotherCell index={0} figure={[1, 1, 1, 1]} />);
    expect(screen.getByText("Mother 1")).toBeInTheDocument();
    expect(screen.getByText("Via")).toBeInTheDocument();
  });

  it("read-only by default", () => {
    const { container } = render(
      <MotherCell index={0} figure={[1, 1, 1, 1]} />,
    );
    expect(
      container.querySelector('button[aria-label*="Toggle"]'),
    ).toBeNull();
  });

  it("editable: each line is a tap-to-toggle button", () => {
    const { container } = render(
      <MotherCell index={0} figure={[1, 1, 1, 1]} editable />,
    );
    expect(
      container.querySelectorAll('button[aria-label*="Toggle"]'),
    ).toHaveLength(4);
  });

  it("toggle fires with the inverted value", () => {
    const onToggleLine = vi.fn();
    render(
      <MotherCell
        index={1}
        figure={[1, 1, 1, 1]}
        editable
        onToggleLine={onToggleLine}
      />,
    );
    fireEvent.click(
      screen.getByLabelText("Toggle line 1 of Mother 2"),
    );
    expect(onToggleLine).toHaveBeenCalledWith(0, 2);
  });
});

// ─── GeoShield ───────────────────────────────────────────────────

describe("GeoShield", () => {
  it("renders the 16 shield cards (8 mothers+daughters + 4 nieces + 2 witnesses + judge + reconciler)", () => {
    const { container } = render(<GeoShield shield={sampleShield} />);
    const cards = container.querySelectorAll("[data-shield-cell]");
    expect(cards).toHaveLength(16);
  });

  it("renders the Mother N labels verbatim", () => {
    const { container } = render(<GeoShield shield={sampleShield} />);
    const labels = Array.from(
      container.querySelectorAll("[data-shield-cell]"),
    ).map((c) => c.getAttribute("data-label"));
    expect(labels).toContain("Mother 1");
    expect(labels).toContain("Daughter 4");
    expect(labels).toContain("The Judge");
    expect(labels).toContain("Reconciler");
  });

  it("never uses --danger (Carcer/Rubeus/Cauda Draconis are neutral)", () => {
    // Force the cascade to render a known difficult figure.
    const carcerMothers: [GeoFigure, GeoFigure, GeoFigure, GeoFigure] = [
      [1, 2, 2, 1], // Carcer
      [1, 2, 2, 1],
      [1, 2, 2, 1],
      [1, 2, 2, 1],
    ];
    const shield = deriveShield(carcerMothers);
    const { container } = render(<GeoShield shield={shield} />);
    expect(container.innerHTML).not.toContain("--danger");
  });
});

// ─── GeoHouseChart ───────────────────────────────────────────────

describe("GeoHouseChart", () => {
  it("renders 12 house buttons + 4 centre cells (witnesses · Judge · Reconciler)", () => {
    const { container } = render(
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={0}
        onSelectHouse={() => {}}
      />,
    );
    expect(
      container.querySelectorAll("[data-house-index]"),
    ).toHaveLength(12);
    expect(
      container.querySelectorAll("[data-centre-cell]"),
    ).toHaveLength(4);
  });

  it("marks the selected house with aria-pressed=true and accent border", () => {
    const { container } = render(
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={5}
        onSelectHouse={() => {}}
      />,
    );
    const sixth = container.querySelector(
      '[data-house-index="5"]',
    ) as HTMLElement;
    expect(sixth.getAttribute("aria-pressed")).toBe("true");
    expect(sixth.style.borderColor).toBe("var(--accent)");
  });

  it("fires onSelectHouse with the picked index", () => {
    const onSelectHouse = vi.fn();
    render(
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={0}
        onSelectHouse={onSelectHouse}
      />,
    );
    fireEvent.click(
      screen.getByLabelText(/House III,/),
    );
    expect(onSelectHouse).toHaveBeenCalledWith(2);
  });

  it("centre cells label witnesses + judge + reconciler", () => {
    const { container } = render(
      <GeoHouseChart
        shield={sampleShield}
        selectedHouse={0}
        onSelectHouse={() => {}}
      />,
    );
    expect(
      container.querySelector('[data-centre-cell="rightWitness"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-centre-cell="judge"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-centre-cell="reconciler"]'),
    ).not.toBeNull();
  });
});

// ─── GeoVerdict ──────────────────────────────────────────────────

describe("GeoVerdict", () => {
  it("renders house numeral · topic · figure name + meaning + witnesses", () => {
    render(
      <GeoVerdict shield={sampleShield} selectedHouse={0} />,
    );
    expect(screen.getByText(/House I · the querent/)).toBeInTheDocument();
    // Verdict figure name + meaning are present.
    expect(screen.getByText("Right witness")).toBeInTheDocument();
    expect(screen.getByText("Left witness")).toBeInTheDocument();
    expect(screen.getByText("Reconciler")).toBeInTheDocument();
  });

  it("Save button fires onSave", () => {
    const onSave = vi.fn();
    render(
      <GeoVerdict
        shield={sampleShield}
        selectedHouse={0}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByText("Save chart to journal"));
    expect(onSave).toHaveBeenCalled();
  });
});

// ─── GeomancySurface ────────────────────────────────────────────

describe("GeomancySurface", () => {
  it("renders the DEFAULT_MOTHERS state (question empty per b108-2ff)", () => {
    const { container } = render(<GeomancySurface />);
    // Four Mother cells present; the question seed is now empty so
    // the field is blank until the practitioner types their own.
    expect(
      container.querySelectorAll("[data-component='mother-cell']"),
    ).toHaveLength(4);
  });

  it("method=gen shows 'Mark the points anew' button + the gen hint", () => {
    render(<GeomancySurface />);
    expect(screen.getByText("Mark the points anew")).toBeInTheDocument();
    expect(
      screen.getByText(/Sixteen rows of points/),
    ).toBeInTheDocument();
  });

  it("method=paper hides cast button, shows the paper hint", () => {
    render(<GeomancySurface initialMethod="paper" />);
    expect(screen.queryByText("Mark the points anew")).toBeNull();
    expect(
      screen.getByText(/Tap a line in each Mother/),
    ).toBeInTheDocument();
  });

  it("paper mode: Mother cells become editable", () => {
    const { container } = render(<GeomancySurface initialMethod="paper" />);
    const editableCells = container.querySelectorAll(
      "[data-component='mother-cell'][data-editable='true']",
    );
    expect(editableCells).toHaveLength(4);
  });

  it("Mark the points anew rerolls the Mothers via the injected RNG", () => {
    // random()=0 → every line is 1 (single point) → all four Mothers = Via [1,1,1,1].
    const { container } = render(<GeomancySurface random={() => 0} />);
    fireEvent.click(screen.getByText("Mark the points anew"));
    // After reroll all four Mother cells show "Via" as figure name.
    const figureNames = Array.from(
      container.querySelectorAll(
        "[data-component='mother-cell'] [data-figure-name]",
      ),
    ).map((el) => el.textContent);
    expect(figureNames).toEqual(["Via", "Via", "Via", "Via"]);
  });

  it("clicking a house updates the verdict aside", () => {
    const { container } = render(<GeomancySurface />);
    const houseIII = container.querySelector('[data-house-index="2"]');
    fireEvent.click(houseIII as HTMLElement);
    expect(screen.getByText(/House III · kin/)).toBeInTheDocument();
  });

  it("paper mode: toggling a Mother line propagates through the cascade", () => {
    const { container } = render(
      <GeomancySurface
        initialMethod="paper"
        initialMothers={[
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
          [1, 1, 1, 1],
        ]}
      />,
    );
    // All four Mothers = Via initially; House I (Mother 1) reads Via.
    expect(screen.getByText(/House I · the querent/)).toBeInTheDocument();
    // Toggle Mother 1's first line. We expect the cascade to re-derive.
    const toggle = container.querySelector(
      "[data-mother-index='0'] [data-line-index='0']",
    );
    fireEvent.click(toggle as HTMLElement);
    // Mother 1 is no longer [1,1,1,1]; the verdict figure name shifts.
    // Concrete assertion: House I's figure name is no longer Via.
    const verdictName = container.querySelector(
      "[data-component='geo-verdict'] [data-figure-name]",
    );
    expect(verdictName?.textContent).not.toBe("Via");
  });

  it("Save button fires onSave with a title naming the Judge", () => {
    const onSave = vi.fn();
    render(<GeomancySurface onSave={onSave} />);
    fireEvent.click(screen.getByText("Save chart to journal"));
    expect(onSave).toHaveBeenCalledWith(
      expect.stringMatching(/^Geomancy — /),
    );
  });

  it("eyebrows show the verbatim labels (Mothers · Shield · Houses)", () => {
    render(<GeomancySurface />);
    expect(screen.getByText("The four Mothers")).toBeInTheDocument();
    expect(screen.getByText(SHIELD_EYEBROW)).toBeInTheDocument();
    expect(screen.getByText(HOUSES_EYEBROW)).toBeInTheDocument();
  });

  it("never uses --danger (the §S3.1 difficulty-is-text rule)", () => {
    const { container } = render(<GeomancySurface />);
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("edit question button fires onEditQuestion", () => {
    const onEditQuestion = vi.fn();
    render(<GeomancySurface onEditQuestion={onEditQuestion} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEditQuestion).toHaveBeenCalled();
  });
});
