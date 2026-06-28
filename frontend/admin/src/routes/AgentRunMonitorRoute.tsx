/**
 * AgentRunMonitor — H10 C7 admin route (live data).
 *
 * Reads a single agent run by id from the bridge. The run's cost
 * snapshot powers the token chips; the audit log (filtered to this
 * run_id) powers the human activity rows. Halt button calls
 * apiMethods.terminateAgentRun.
 *
 * Mounted at /agents/runs/:runId.
 */

import {
  AgentRunMonitorSurface,
  type HumanActivityRow,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function describeEvent(et: string, detail: string | null, toolName: string | null, filteredCount: number): string {
  switch (et) {
    case "run.started":
      return "Run started.";
    case "run.completed":
      return "Run completed.";
    case "run.halted":
      return "Run halted by you.";
    case "run.errored":
      return detail ? `Run errored: ${detail}` : "Run errored.";
    case "mcp.tools_list":
      return "Enumerated available tools.";
    case "mcp.tools_call":
      if (filteredCount > 0) {
        return `Called ${toolName ?? "tool"} (filtered ${filteredCount} private record${filteredCount === 1 ? "" : "s"}).`;
      }
      return `Called ${toolName ?? "tool"}.`;
    case "mcp.capability_denied":
      return `Refused ${toolName ?? "tool"}: capability not granted.`;
    case "cap.refused_at_wake":
      return detail ? `Refused at wake: ${detail}` : "Refused at wake (cost cap).";
    case "cap.halted_at_spend":
      return detail ? `Halted: ${detail}` : "Halted (cost cap reached).";
    default:
      return et;
  }
}

export function AgentRunMonitorRoute() {
  const { runId } = useParams<{ runId: string }>();
  const queryClient = useQueryClient();

  useTopbar(() => ({
    title: "Run monitor",
    subtitle: runId ?? "—",
  }));

  const runQuery = useQuery({
    queryKey: ["agent-run", runId],
    queryFn: async () => {
      if (!runId) throw new Error("missing runId");
      return apiMethods.getAgentRun(runId);
    },
    enabled: Boolean(runId),
    refetchInterval: (queryData) => {
      const data = queryData.state.data;
      // Poll while running; stop on terminal status.
      if (!data) return 2000;
      return data.status === "running" || data.status === "pending"
        ? 2000
        : false;
    },
  });

  const auditQuery = useQuery({
    queryKey: ["agent-audit-run", runId],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 200 }),
    refetchInterval: 5000,
    enabled: Boolean(runId),
  });

  const haltMutation = useMutation({
    mutationFn: async () => {
      if (!runId) throw new Error("missing runId");
      return apiMethods.terminateAgentRun(runId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
    },
  });

  const run = runQuery.data;
  const finished = run
    ? run.status === "completed" ||
      run.status === "halted" ||
      run.status === "errored"
    : false;

  // Filter audit events to this run + oldest-first for the timeline.
  const events = auditQuery.data?.events ?? [];
  const runEvents = events
    .filter((e) => e.run_id === runId)
    .sort((a, b) => a.happened_at.localeCompare(b.happened_at));

  const humanActivity: HumanActivityRow[] = runEvents.map((e, idx) => {
    const isLast = idx === runEvents.length - 1;
    let tone: HumanActivityRow["tone"] = "done";
    if (!finished && isLast) tone = "live";
    if (!e.allowed) tone = "pending";
    return {
      text: describeEvent(e.event_type, e.detail, e.tool_name, e.filtered_count),
      tone,
    };
  });

  const cost = run?.cost;
  const tokensFresh = cost?.tokens_fresh ?? 0;
  const tokensResume = cost?.tokens_resume ?? 0;
  const tokensTotal = (cost?.tokens_in ?? 0) + (cost?.tokens_out ?? 0);

  return (
    <AgentRunMonitorSurface
      humanActivity={humanActivity}
      tokensTotal={tokensTotal}
      tokensFresh={tokensFresh}
      tokensResume={tokensResume}
      finished={finished}
      onHalt={finished ? undefined : () => haltMutation.mutate()}
    />
  );
}
