/**
 * AgentTranscriptViewer — H10 C8 admin route (live data).
 *
 * The "transcript" displayed here is the audit-log derived view of a
 * run: the daemon's honest record of what was called + what was
 * filtered. The raw subprocess stdout/stderr lives behind the SSE
 * stream and isn't surfaced here in v1 (rule 55 — human-readable
 * narration, not raw logs by default).
 *
 * Mounted at /agents/runs/:runId/transcript.
 */

import {
  AgentTranscriptViewerSurface,
  type SpeakerKind,
  type TranscriptRow,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function describeAuditAsBody(
  eventType: string,
  detail: string | null,
  toolName: string | null,
  args: Record<string, unknown> | null,
  filteredCount: number,
): string {
  if (eventType === "mcp.tools_call") {
    const argSummary = args
      ? Object.entries(args)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
          .join(", ")
      : "";
    let line = `Tool call: ${toolName ?? "unknown"}(${argSummary})`;
    if (filteredCount > 0) {
      line += ` — filtered ${filteredCount} private record${filteredCount === 1 ? "" : "s"} from result`;
    }
    return line;
  }
  if (eventType === "mcp.capability_denied") {
    return `Refused: capability ${toolName ?? "?"} not granted`;
  }
  if (eventType === "mcp.tools_list") return "Listed available tools.";
  if (eventType === "run.started") return "Run started.";
  if (eventType === "run.completed") return "Run completed.";
  if (eventType === "run.halted") return "Run halted by user.";
  if (eventType === "run.errored")
    return detail ? `Run errored: ${detail}` : "Run errored.";
  if (eventType === "cap.refused_at_wake")
    return detail ? `Cap refused at wake: ${detail}` : "Refused at wake (cost cap).";
  if (eventType === "cap.halted_at_spend")
    return detail ? `Cap halted: ${detail}` : "Halted (cost cap).";
  return eventType;
}

function speakerOf(eventType: string): SpeakerKind {
  // run.started + run.completed + run.halted are operator/system events;
  // the rest are the agent's own activity.
  if (
    eventType === "run.started"
    || eventType === "run.halted"
    || eventType === "cap.refused_at_wake"
    || eventType === "cap.halted_at_spend"
  ) {
    return "magician";
  }
  return "agent";
}

export function AgentTranscriptViewerRoute() {
  const { runId } = useParams<{ runId: string }>();

  useTopbar(() => ({
    title: "Transcript",
    subtitle: runId ?? "—",
  }));

  const query = useQuery({
    queryKey: ["agent-transcript", runId],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 500 }),
    staleTime: 5_000,
    refetchInterval: 5_000,
    enabled: Boolean(runId),
  });

  const rows = useMemo<TranscriptRow[]>(() => {
    const events = query.data?.events ?? [];
    return events
      .filter((e) => e.run_id === runId)
      .sort((a, b) => a.happened_at.localeCompare(b.happened_at))
      .map((e, idx) => ({
        id: `${runId}-${idx}`,
        speaker: speakerOf(e.event_type),
        body: describeAuditAsBody(
          e.event_type,
          e.detail,
          e.tool_name,
          e.arguments_json,
          e.filtered_count,
        ),
      }));
  }, [query.data, runId]);

  return <AgentTranscriptViewerSurface rows={rows} />;
}
