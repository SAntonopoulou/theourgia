/**
 * AgentActivityLog — H10 Cluster C11 surface copy.
 *
 * Rule 55 — human-readable summary text PER ROW. The transcript link
 * is the way to drill in.
 */

export type ActivityTimeRange = "last_30_days" | "last_90_days" | "all_time";

export const TIME_RANGE_OPTIONS: readonly {
  key: ActivityTimeRange;
  label: string;
}[] = [
  { key: "last_30_days", label: "Last 30 days" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "all_time", label: "All time" },
];

export type OutcomeFilter = "all" | "completed" | "halted" | "errored";

export const OUTCOME_OPTIONS: readonly {
  key: OutcomeFilter;
  label: string;
}[] = [
  { key: "all", label: "All outcomes" },
  { key: "completed", label: "Completed" },
  { key: "halted", label: "Halted" },
  { key: "errored", label: "Errored" },
];

export type RunOutcome = "completed" | "halted" | "errored";

export const TRANSCRIPT_LABEL = "Transcript";
