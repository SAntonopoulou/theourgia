/**
 * AgentActivityLog — H10 C11 admin route (live data).
 *
 * Lists past runs derived from the audit log. One row per unique
 * run_id, summarised by its terminal event (completed / halted /
 * errored). Token totals come from the per-run `mcp.tools_call`
 * events' filtered_count + the daemon's bookkeeping; for v1 we
 * approximate by counting events per run.
 *
 * Mounted at /agents-activity.
 */

import {
  type ActivityRunOutcome,
  type ActivityRunRow,
  type ActivityTimeRange,
  AgentActivityLogSurface,
  type OutcomeFilter,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function formatLocal(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-GB", { month: "short" });
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${hh}:${mm}`;
}

function mapTerminalToOutcome(eventType: string): ActivityRunOutcome {
  if (eventType === "run.halted" || eventType === "cap.halted_at_spend") {
    return "halted";
  }
  if (eventType === "run.errored") return "errored";
  return "completed";
}

export function AgentActivityLogRoute() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<ActivityTimeRange>("last_30_days");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  useTopbar(() => ({
    title: "Activity",
    subtitle: "What your agents have done · oldest to newest",
  }));

  const query = useQuery({
    queryKey: ["agent-activity-log", timeRange],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 500 }),
    staleTime: 15_000,
  });

  const rows = useMemo<ActivityRunRow[]>(() => {
    const events = query.data?.events ?? [];

    // Group events by run_id; the terminal event wins for the summary.
    const byRun = new Map<
      string,
      {
        terminal: string;
        terminalAt: string;
        callCount: number;
        firstAt: string;
      }
    >();

    for (const e of events) {
      if (!e.run_id) continue;
      const slot = byRun.get(e.run_id) ?? {
        terminal: "",
        terminalAt: e.happened_at,
        callCount: 0,
        firstAt: e.happened_at,
      };
      if (e.event_type === "mcp.tools_call") slot.callCount += 1;
      if (
        e.event_type === "run.completed"
        || e.event_type === "run.halted"
        || e.event_type === "run.errored"
        || e.event_type === "cap.halted_at_spend"
      ) {
        slot.terminal = e.event_type;
        slot.terminalAt = e.happened_at;
      }
      if (e.happened_at < slot.firstAt) slot.firstAt = e.happened_at;
      byRun.set(e.run_id, slot);
    }

    const built: ActivityRunRow[] = [];
    for (const [runId, slot] of byRun) {
      if (!slot.terminal) continue;  // skip still-running rows
      built.push({
        id: runId,
        time: formatLocal(slot.terminalAt),
        summary: `${slot.callCount} tool call${slot.callCount === 1 ? "" : "s"}`,
        outcome: mapTerminalToOutcome(slot.terminal),
        tokensLabel: "—",
        transcriptHref: `/agents/runs/${encodeURIComponent(runId)}`,
      });
    }
    built.sort((a, b) => (a.time < b.time ? 1 : -1));
    if (outcome === "all") return built;
    return built.filter((r) => r.outcome === outcome);
  }, [query.data, outcome]);

  return (
    <AgentActivityLogSurface
      rows={rows}
      timeRange={timeRange}
      outcome={outcome}
      onTimeRangeChange={setTimeRange}
      onOutcomeChange={setOutcome}
      onOpenTranscript={(id) => navigate(`/agents/runs/${encodeURIComponent(id)}`)}
    />
  );
}
