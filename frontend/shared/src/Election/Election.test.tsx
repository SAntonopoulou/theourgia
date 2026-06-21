import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ElectionRecipeCard } from "./ElectionRecipeCard.js";
import { ElectionResultCard } from "./ElectionResultCard.js";
import { ProductScoringCallout } from "./ProductScoringCallout.js";
import type {
  ElectionBreakdownRow,
  ElectionRecipe,
  ElectionResult,
} from "./types.js";

const mercuryRecipe: ElectionRecipe = {
  id: "mercury-letters",
  title: "Mercury for letters",
  glyph: "☿",
  blurb: "Hour of Mercury, Moon waxing, no malefic squares.",
  source: "Picatrix III.7",
};

const breakdown: ElectionBreakdownRow[] = [
  {
    id: "b1",
    icon: "☿",
    iconColor: "var(--pl-merc)",
    constraint: "Mercury hour",
    reason: "Hour of Mercury at 09:15.",
    scoreString: "1.00",
  },
  {
    id: "b2",
    icon: "☽",
    iconColor: "var(--pl-moon)",
    constraint: "Moon waxing",
    reason: "Moon 38% illuminated, growing.",
    scoreString: "1.00",
  },
  {
    id: "b3",
    icon: "□",
    iconColor: "var(--pl-mars)",
    constraint: "No Mars square",
    reason: "Closest Mars square is 6.4° — outside orb.",
    scoreString: "1.00",
  },
];

const passingResult: ElectionResult = {
  id: "r1",
  when: "Sun 21 Jun · 09:15",
  relativeWhen: "in 18h",
  passSummary: "3 / 3 passed",
  score: 0.74,
  scoreString: "0.74",
  breakdown,
  badge: { label: "Strong", color: "var(--verify)" },
};

const failingResult: ElectionResult = {
  id: "r2",
  when: "Sun 21 Jun · 14:30",
  relativeWhen: "in 23h",
  passSummary: "2 / 3 passed",
  score: 0,
  scoreString: "0.00",
  breakdown: [
    ...breakdown.slice(0, 2),
    {
      id: "b3-fail",
      icon: "□",
      iconColor: "var(--pl-mars)",
      constraint: "No Mars square",
      reason: "Mars square within 2.1° — fails orb.",
      scoreString: "0.00",
      failed: true,
    },
  ],
};

// ─── ProductScoringCallout ─────────────────────────────────────────

describe("ProductScoringCallout", () => {
  it("renders the canonical title + body verbatim", () => {
    render(<ProductScoringCallout />);
    expect(screen.getByText("Every constraint is decisive.")).toBeInTheDocument();
    expect(
      screen.getByText(/Scoring is multiplicative/),
    ).toBeInTheDocument();
    expect(screen.getByText("zero")).toBeInTheDocument();
    expect(screen.getByText("everything")).toBeInTheDocument();
  });

  it("attaches the structural data-component attribute", () => {
    const { container } = render(<ProductScoringCallout />);
    expect(container.firstElementChild).toHaveAttribute(
      "data-component",
      "product-scoring-callout",
    );
  });
});

// ─── ElectionRecipeCard ────────────────────────────────────────────

describe("ElectionRecipeCard", () => {
  it("renders the glyph + title + blurb + source", () => {
    render(<ElectionRecipeCard recipe={mercuryRecipe} />);
    expect(screen.getByText("☿")).toBeInTheDocument();
    expect(screen.getByText("Mercury for letters")).toBeInTheDocument();
    expect(
      screen.getByText(/Hour of Mercury, Moon waxing/),
    ).toBeInTheDocument();
    expect(screen.getByText("Picatrix III.7")).toBeInTheDocument();
  });

  it("hides the source when not provided", () => {
    const { container } = render(
      <ElectionRecipeCard
        recipe={{ ...mercuryRecipe, source: undefined }}
      />,
    );
    expect(container.textContent).not.toContain("Picatrix");
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <ElectionRecipeCard recipe={mercuryRecipe} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks the active state with aria-pressed + data attribute", () => {
    const { container } = render(
      <ElectionRecipeCard recipe={mercuryRecipe} active />,
    );
    const btn = container.firstElementChild as HTMLElement;
    expect(btn.getAttribute("data-active")).toBe("true");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});

// ─── ElectionResultCard ────────────────────────────────────────────

describe("ElectionResultCard", () => {
  it("renders rank + when + pass summary + score", () => {
    render(<ElectionResultCard result={passingResult} rank={1} />);
    expect(screen.getByText("1")).toBeInTheDocument(); // rank chip
    expect(screen.getByText("Sun 21 Jun · 09:15")).toBeInTheDocument();
    expect(screen.getByText(/in 18h · 3 \/ 3 passed/)).toBeInTheDocument();
    expect(screen.getByText("0.74")).toBeInTheDocument();
  });

  it("renders the badge when supplied", () => {
    render(<ElectionResultCard result={passingResult} rank={1} />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("expands and reveals the breakdown when opened", () => {
    render(
      <ElectionResultCard result={passingResult} rank={1} open />,
    );
    expect(screen.getByText("Mercury hour")).toBeInTheDocument();
    expect(screen.getByText("Moon waxing")).toBeInTheDocument();
    expect(screen.getByText("No Mars square")).toBeInTheDocument();
  });

  it("hides the breakdown when collapsed", () => {
    render(<ElectionResultCard result={passingResult} rank={1} />);
    expect(screen.queryByText("Mercury hour")).toBeNull();
  });

  it("calls onToggle(true) when the header is clicked from collapsed", () => {
    const onToggle = vi.fn();
    render(
      <ElectionResultCard
        result={passingResult}
        rank={1}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("marks data-failed=true and shows the score in the fail tone for score < 0.001", () => {
    const { container } = render(
      <ElectionResultCard result={failingResult} rank={4} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-failed")).toBe("true");
    // The score element uses --fail color via style.
    const score = container.querySelector("[data-score]") as HTMLElement;
    expect(score.style.color).toBe("var(--fail)");
  });

  it("marks failing breakdown rows with data-breakdown-failed=true", () => {
    const { container } = render(
      <ElectionResultCard result={failingResult} rank={4} open />,
    );
    const failedRows = container.querySelectorAll(
      '[data-breakdown-failed="true"]',
    );
    expect(failedRows).toHaveLength(1);
  });

  it("renders the action slot below the breakdown when open", () => {
    render(
      <ElectionResultCard
        result={passingResult}
        rank={1}
        open
        actions={<button>Add to calendar</button>}
      />,
    );
    expect(screen.getByText("Add to calendar")).toBeInTheDocument();
  });

  it("attaches structural data attributes", () => {
    const { container } = render(
      <ElectionResultCard result={passingResult} rank={2} open />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-result-id")).toBe("r1");
    expect(root.getAttribute("data-rank")).toBe("2");
    expect(root.getAttribute("data-open")).toBe("true");
  });
});
