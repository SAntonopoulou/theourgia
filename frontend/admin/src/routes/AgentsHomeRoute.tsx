/**
 * AgentsHome — H10 Cluster C1 admin route (live data).
 *
 * Mounts the AgentsHomeSurface from @theourgia/shared. Reads the list
 * of installed agents from the audit log (recent activity) — there's
 * no GET /api/v1/agents/list endpoint yet; the audit history is the
 * closest proxy until that lands.
 *
 * This is the worked example for the rest of the H10 C-cluster: each
 * other surface (AgentRunMonitor, AgentCostDashboard, etc.) follows
 * the same pattern — TanStack Query call to apiMethods, map to the
 * surface's prop shape, mount the Surface, error states via
 * SurfaceSkeleton + SurfaceError.
 *
 * Routing: mounted at /agents-home alongside the legacy /agents route.
 * Phase 16.1 will swap them.
 */

import {
  type AgentRow,
  AgentsHomeSurface,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

interface AgentSummary {
  id: string;
  name: string;
  kind: AgentRow["kind"];
  lastActive: string;
  status: AgentRow["status"];
}

function formatLastActive(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const delta = Math.max(0, now - then);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function AgentsHomeRoute() {
  const navigate = useNavigate();

  useTopbar(() => ({
    title: "Agents",
    subtitle: "Opt-in companions · your keys, your instance, your memory",
  }));

  // Live data: pull recent run.started + run.completed events from the
  // audit log; each unique install_id is a row. When the backend ships
  // a dedicated /agents/list endpoint, swap this query for it.
  const query = useQuery({
    queryKey: ["agents-home", "audit"],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 100 }),
    staleTime: 30_000,
  });

  // Map audit rows → AgentRow[] (one per unique install_id with most
  // recent activity). The audit log doesn't carry agent name / kind
  // yet — for v1 we use install_id as the placeholder name.
  const active: AgentSummary[] = (() => {
    if (!query.data) return [];
    const seen = new Map<string, AgentSummary>();
    for (const event of query.data.events) {
      const id = event.install_id || event.run_id;
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        id,
        name: id,
        kind: "archivist",  // placeholder; bridge doesn't surface kind yet
        lastActive: formatLastActive(event.happened_at),
        status: event.event_type === "run.completed" ? "active" : "active",
      });
    }
    return [...seen.values()];
  })();

  return (
    <AgentsHomeSurface
      active={active}
      disabled={[]}
      activeNav="agents"
      onOpen={(id) => navigate(`/agents/${id}`)}
      onBrowseMarketplace={() => navigate("/agents/marketplace")}
    />
  );
}
