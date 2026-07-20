/**
 * AgentCostDashboard — H10 C10 admin route (live data).
 *
 * v1-031: wired to the daemon's cost aggregation via the vault proxy
 * (GET /api/v1/agents/costs/summary). Real per-install cost + token
 * figures, the rule-58 fresh/resume split, and the rule-56 monthly
 * cap percentage replace the earlier audit-event approximation.
 *
 * Mounted at /agents-cost.
 */

import { useQuery } from "@tanstack/react-query";
import {
  AgentCostDashboardSurface,
  type AgentCostSummaryInstallRow,
  type AgentRowKind,
  type PerAgentRow,
  type TokenBreakdown,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";

const ZERO: TokenBreakdown = { in_: 0, out_: 0, cache: 0 };

const KIND_TO_ROW_KIND: Record<string, AgentRowKind> = {
  "divination-companion": "divination",
  "scrying-journal-partner": "divination",
  "ritual-aide": "ritual",
  "study-tutor": "study",
  "correspondence-research-helper": "correspondence",
  "synchronicity-reviewer": "synchronicity",
};

function rowKindFor(kind: string): AgentRowKind {
  return KIND_TO_ROW_KIND[kind] ?? "archivist";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
}

function formatUsd(value: string): string {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "—";
}

function toPerAgentRow(row: AgentCostSummaryInstallRow): PerAgentRow {
  const tokens = row.tokens_in + row.tokens_out + row.tokens_cache;
  const hasCap = Number.parseFloat(row.monthly_cap_usd) > 0;
  return {
    id: row.install_id,
    name: row.display_name,
    kind: rowKindFor(row.kind),
    costLabel: formatUsd(row.cost_usd),
    tokensLabel: formatTokens(tokens),
    freshResumeLabel: `${formatTokens(row.tokens_fresh)} / ${formatTokens(row.tokens_resume)}`,
    capLabel: hasCap ? formatUsd(row.monthly_cap_usd) : "—",
    capUsedPct: row.cap_used_pct,
  };
}

export function AgentCostDashboardRoute() {
  useTopbar(() => ({
    title: "Cost",
    subtitle: "Token spend · per agent · this month",
  }));

  const query = useQuery({
    queryKey: ["agent-cost-summary", "month"],
    queryFn: async () => apiMethods.getAgentCostSummary("month"),
    staleTime: 30_000,
  });

  const summary = query.data;
  const totals = summary?.totals;
  const totalTokens = totals ? totals.tokens_in + totals.tokens_out + totals.tokens_cache : 0;

  return (
    <AgentCostDashboardSurface
      totalCostLabel={totals ? formatUsd(totals.cost_usd) : "—"}
      totalTokensLabel={totals ? formatTokens(totalTokens) : "—"}
      totalTokenBreakdown={
        totals
          ? {
              in_: totals.tokens_in,
              out_: totals.tokens_out,
              cache: totals.tokens_cache,
            }
          : ZERO
      }
      perAgent={(summary?.per_install ?? []).map(toPerAgentRow)}
    />
  );
}
