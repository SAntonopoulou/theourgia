/**
 * AgentsHome — H10 C1 admin route (live install + activity data).
 *
 * Reads the real install list via /api/v1/agents/installs (Phase 16
 * lifecycle), partitioned into active rows + disabled rows based on
 * each install's state. Last-active comes from the audit log filtered
 * to the install_id; when the audit history doesn't carry an event
 * for the install, last-active falls back to the install's
 * created_at.
 *
 * Mounted at /agents-home.
 */

import {
  type AgentRow,
  type DisabledAgentRow,
  AgentsHomeSurface,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function formatLastActive(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function kindOf(_kind: string): AgentRow["kind"] {
  // The daemon's `kind` field is free-form (set at install time); the
  // surface's AgentKind union is a fixed set. For v1, classify as
  // `archivist` for anything outside the known list until a richer
  // kind taxonomy lands.
  return "archivist";
}

export function AgentsHomeRoute() {
  const navigate = useNavigate();

  useTopbar(() => ({
    title: "Agents",
    subtitle: "Opt-in companions · your keys, your instance, your memory",
  }));

  const installsQuery = useQuery({
    queryKey: ["agent-installs"],
    queryFn: async () => apiMethods.listAgentInstalls(),
    staleTime: 30_000,
  });

  const auditQuery = useQuery({
    queryKey: ["agents-home", "audit"],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 100 }),
    staleTime: 30_000,
  });

  // Build last-active map from audit events keyed by install_id.
  const lastActiveByInstall = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    for (const e of auditQuery.data?.events ?? []) {
      if (!e.install_id) continue;
      const prior = map.get(e.install_id);
      if (!prior || e.happened_at > prior) {
        map.set(e.install_id, e.happened_at);
      }
    }
    return map;
  }, [auditQuery.data]);

  const { active, disabled } = useMemo<{
    active: AgentRow[];
    disabled: DisabledAgentRow[];
  }>(() => {
    const activeRows: AgentRow[] = [];
    const disabledRows: DisabledAgentRow[] = [];
    for (const row of installsQuery.data?.installs ?? []) {
      const lastSeen =
        lastActiveByInstall.get(row.id) ?? row.created_at;
      if (row.state === "active" || row.state === "inactive") {
        activeRows.push({
          id: row.id,
          name: row.display_name,
          kind: kindOf(row.kind),
          lastActive: formatLastActive(lastSeen),
          status: "active",
        });
      } else if (row.state === "cost_capped") {
        activeRows.push({
          id: row.id,
          name: row.display_name,
          kind: kindOf(row.kind),
          lastActive: formatLastActive(lastSeen),
          status: "cost-capped",
        });
      } else {
        // paused → disabled column
        disabledRows.push({
          id: row.id,
          name: row.display_name,
          kind: kindOf(row.kind),
        });
      }
    }
    return { active: activeRows, disabled: disabledRows };
  }, [installsQuery.data, lastActiveByInstall]);

  return (
    <AgentsHomeSurface
      active={active}
      disabled={disabled}
      activeNav="agents"
      onOpen={(id) => navigate(`/agents/${id}/compose`)}
      onBrowseMarketplace={() => navigate("/agents-marketplace")}
    />
  );
}
