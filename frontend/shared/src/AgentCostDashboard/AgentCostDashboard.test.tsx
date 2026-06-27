/**
 * AgentCostDashboard — H10 Cluster C10 tests.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AgentCostDashboardSurface } from "./AgentCostDashboardSurface.js";
import type { PerAgentRow } from "./AgentCostDashboardSurface.js";

const ROWS: PerAgentRow[] = [
  {
    id: "div",
    name: "Divination companion",
    kind: "divination",
    costLabel: "$3.10",
    tokensLabel: "820K",
    freshResumeLabel: "180K / 640K",
    capLabel: "$10.00",
    capUsedPct: 31,
  },
  {
    id: "sync",
    name: "Synchronicity weaver",
    kind: "synchronicity",
    costLabel: "$3.40",
    tokensLabel: "910K",
    freshResumeLabel: "210K / 700K",
    capLabel: "$3.50",
    capUsedPct: 97,
  },
  {
    id: "study",
    name: "Study tutor",
    kind: "study",
    costLabel: "$0.32",
    tokensLabel: "110K",
    freshResumeLabel: "40K / 70K",
    capLabel: "$5.00",
    capUsedPct: 6,
  },
];

describe("AgentCostDashboardSurface", () => {
  test("vault totals tiles render cost + tokens + 'across all agents'", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 412000, out_: 168000, cache: 1260000 }}
        perAgent={ROWS}
      />,
    );
    expect(screen.getByText("$6.82")).toBeInTheDocument();
    expect(screen.getByText("1.84M")).toBeInTheDocument();
    expect(screen.getByText("across all agents")).toBeInTheDocument();
  });

  test("token breakdown shows in/out/cache split", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 412000, out_: 168000, cache: 1260000 }}
        perAgent={ROWS}
      />,
    );
    expect(
      screen.getByText(/in 412K · out 168K · cache 1\.26M/i),
    ).toBeInTheDocument();
  });

  test("rule 58 — fresh/resume split renders for every per-agent row", () => {
    const { container } = render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
      />,
    );
    const splits = container.querySelectorAll('[data-fresh-resume]');
    expect(splits.length).toBe(ROWS.length);
    expect(splits[0]?.textContent).toContain("180K / 640K");
    expect(splits[1]?.textContent).toContain("210K / 700K");
  });

  test("cap chip colors follow rule-56 proximity bands", () => {
    const { container } = render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
      />,
    );
    // 31% → peer-ok-soft
    expect(screen.getByText("31%").getAttribute("style") ?? "").toContain(
      "var(--peer-ok-soft)",
    );
    // 97% → warn-soft (over 85)
    expect(screen.getByText("97%").getAttribute("style") ?? "").toContain(
      "var(--warn-soft)",
    );
    // 6% → peer-ok-soft (under 60)
    expect(screen.getByText("6%").getAttribute("style") ?? "").toContain(
      "var(--peer-ok-soft)",
    );
  });

  test("at-cap state (>=100%) uses solid --warn background", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$0"
        totalTokensLabel="0"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={[{ ...ROWS[0]!, id: "at-cap", capUsedPct: 100 }]}
      />,
    );
    expect(screen.getByText("100%").getAttribute("style") ?? "").toContain(
      "var(--warn)",
    );
  });

  test("rule 9 — no celebratory color / no gradient fills on totals", () => {
    const { container } = render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
      />,
    );
    const html = container.innerHTML.toLowerCase();
    expect(html).not.toContain("linear-gradient(");
    expect(html).not.toContain("radial-gradient(");
  });

  test("per-agent rows render with name, cost, tokens, cap", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
      />,
    );
    expect(screen.getByText("Divination companion")).toBeInTheDocument();
    expect(screen.getByText("$3.10")).toBeInTheDocument();
    expect(screen.getByText("820K")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
  });

  test("history chart renders when provided", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
        historyChart={<svg data-testid="history-chart" />}
      />,
    );
    expect(screen.getByText(/Cost over the last 12 months/i)).toBeInTheDocument();
    expect(screen.getByTestId("history-chart")).toBeInTheDocument();
  });

  test("history section hidden when historyChart omitted", () => {
    render(
      <AgentCostDashboardSurface
        totalCostLabel="$6.82"
        totalTokensLabel="1.84M"
        totalTokenBreakdown={{ in_: 0, out_: 0, cache: 0 }}
        perAgent={ROWS}
      />,
    );
    expect(
      screen.queryByText(/Cost over the last 12 months/i),
    ).toBeNull();
  });
});
