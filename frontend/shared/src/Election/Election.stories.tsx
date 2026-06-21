/**
 * Election Finder stories — one per primitive plus a couple of
 * meaningful variants (passing result, failing result, recipe
 * gallery row).
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { ElectionRecipeCard } from "./ElectionRecipeCard.js";
import { ElectionResultCard } from "./ElectionResultCard.js";
import { ProductScoringCallout } from "./ProductScoringCallout.js";
import type {
  ElectionBreakdownRow,
  ElectionRecipe,
  ElectionResult,
} from "./types.js";

const meta = {
  title: "Election",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 540,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

const breakdown: ElectionBreakdownRow[] = [
  {
    id: "b1",
    icon: "☿",
    iconColor: "#C39A6B",
    constraint: "Mercury hour",
    reason: "Hour of Mercury at 09:15.",
    scoreString: "1.00",
  },
  {
    id: "b2",
    icon: "☽",
    iconColor: "#AEB4BC",
    constraint: "Moon waxing in Gemini",
    reason: "Moon 38% illuminated, in Gemini, growing.",
    scoreString: "1.00",
  },
  {
    id: "b3",
    icon: "△",
    iconColor: "#5E84B0",
    constraint: "Jupiter trine Mercury (orb ≤ 4°)",
    reason: "Applying trine, separation 2.1°.",
    scoreString: "0.62",
  },
  {
    id: "b4",
    icon: "□",
    iconColor: "#C0584C",
    constraint: "No Mars square",
    reason: "Closest Mars square is 6.4° — outside orb.",
    scoreString: "1.00",
  },
];

const passing: ElectionResult = {
  id: "r1",
  when: "Sun 22 Jun · 09:15",
  relativeWhen: "in 18h 45m",
  passSummary: "4 / 4 passed",
  score: 0.74,
  scoreString: "0.74",
  breakdown,
  badge: { label: "Strong", color: "var(--verify)" },
};

const failing: ElectionResult = {
  id: "r2",
  when: "Sun 22 Jun · 14:30",
  relativeWhen: "in 24h",
  passSummary: "3 / 4 passed",
  score: 0,
  scoreString: "0.00",
  breakdown: [
    ...breakdown.slice(0, 3),
    {
      id: "b4-fail",
      icon: "□",
      iconColor: "#C0584C",
      constraint: "No Mars square",
      reason: "Mars square within 2.1° — fails orb.",
      scoreString: "0.00",
      failed: true,
    },
  ],
};

const recipes: ElectionRecipe[] = [
  {
    id: "mercury-letters",
    title: "Mercury for letters",
    glyph: "☿",
    blurb: "Hour of Mercury, Moon waxing, no malefic squares.",
    source: "Picatrix III.7",
  },
  {
    id: "venus-concord",
    title: "Venus for concord",
    glyph: "♀",
    blurb: "Venus hour, Moon applying to Venus, fortunes angular.",
    source: "Lilly · Christian Astrology III",
  },
  {
    id: "saturn-binding",
    title: "Saturn for binding",
    glyph: "♄",
    blurb: "Saturn hour, Saturn angular, Moon dark.",
    source: "Agrippa · OP II.32",
  },
];

// ─── ProductScoringCallout ─────────────────────────────────────────

export const Scoring_Callout: Story = {
  name: "ProductScoringCallout · default",
  render: () => (
    <Frame>
      <ProductScoringCallout />
    </Frame>
  ),
};

// ─── ElectionRecipeCard ────────────────────────────────────────────

export const Recipe_Gallery: Story = {
  name: "ElectionRecipeCard · gallery row (3 recipes)",
  render: () => {
    const [activeId, setActiveId] = useState("mercury-letters");
    return (
      <Frame width={620}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {recipes.map((r) => (
            <ElectionRecipeCard
              key={r.id}
              recipe={r}
              active={activeId === r.id}
              onSelect={() => setActiveId(r.id)}
            />
          ))}
        </div>
      </Frame>
    );
  },
};

// ─── ElectionResultCard ────────────────────────────────────────────

const ToggleableResult = ({
  result,
  rank,
}: {
  result: ElectionResult;
  rank: number;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <ElectionResultCard
      result={result}
      rank={rank}
      open={open}
      onToggle={setOpen}
    />
  );
};

export const ResultCard_Passing_Collapsed: Story = {
  name: "ElectionResultCard · passing · collapsed",
  render: () => (
    <Frame>
      <ToggleableResult result={passing} rank={1} />
    </Frame>
  ),
};

export const ResultCard_Passing_Expanded: Story = {
  name: "ElectionResultCard · passing · expanded (breakdown)",
  render: () => (
    <Frame>
      <ElectionResultCard
        result={passing}
        rank={1}
        open
        actions={
          <>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md, 8px)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Add to calendar
            </button>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: "var(--r-md, 8px)",
                background: "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              Begin working here
            </button>
          </>
        }
      />
    </Frame>
  ),
};

export const ResultCard_Failing: Story = {
  name: "ElectionResultCard · failing · score 0.00",
  render: () => (
    <Frame>
      <ElectionResultCard result={failing} rank={4} open />
    </Frame>
  ),
};
