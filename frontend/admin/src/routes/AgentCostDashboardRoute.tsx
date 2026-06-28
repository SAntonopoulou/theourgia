/**
 * AgentCostDashboard — H10 C10 admin route (live data).
 *
 * Aggregates audit-log events to a global token + cost rollup. The
 * audit log doesn't yet carry token deltas per event (those live on
 * the run row); for v1 we surface the headline figures with "—" for
 * unknown breakdowns rather than fabricating them. The daemon's
 * install-list endpoint (queued) will replace this with per-install
 * accuracy.
 *
 * Mounted at /agents-cost.
 */

import {
  AgentCostDashboardSurface,
  type PerAgentRow,
  type TokenBreakdown,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";

import { apiMethods } from "../data/api.js";

const ZERO: TokenBreakdown = { in_: 0, out_: 0, cache: 0 };

export function AgentCostDashboardRoute() {
  useTopbar(() => ({
    title: "Cost",
    subtitle: "Token spend · per agent · this month",
  }));

  const query = useQuery({
    queryKey: ["agent-cost-dashboard"],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 500 }),
    staleTime: 30_000,
  });

  const events = query.data?.events ?? [];

  // Per-install rollup: one PerAgentRow per unique install_id.
  // The audit row doesn't carry per-call token deltas, so for v1
  // we display "—" for tokens until the install-list endpoint lands.
  const installs = new Map<string, number>();
  for (const e of events) {
    const id = e.install_id || e.run_id;
    if (!id) continue;
    if (e.event_type === "mcp.tools_call") {
      installs.set(id, (installs.get(id) ?? 0) + 1);
    } else if (!installs.has(id)) {
      installs.set(id, 0);
    }
  }

  const perAgent: PerAgentRow[] = [...installs.entries()].map(
    ([id, callCount]) => ({
      id,
      name: id,
      kind: "archivist" as const,  // placeholder until install-list lands
      costLabel: "—",
      tokensLabel: callCount > 0 ? `${callCount} calls` : "—",
      freshResumeLabel: "—",
      capLabel: "—",
      capUsedPct: 0,
    }),
  );

  return (
    <AgentCostDashboardSurface
      totalCostLabel="—"
      totalTokensLabel={`${events.length} audit event${events.length === 1 ? "" : "s"}`}
      totalTokenBreakdown={ZERO}
      perAgent={perAgent}
    />
  );
}
