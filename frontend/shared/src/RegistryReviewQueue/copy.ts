/**
 * RegistryReviewQueue — H10 Cluster A5 surface copy.
 *
 * The maintainer-facing inbox. Rule 38 — sort is FIFO (oldest first,
 * "clear the queue in order"). NEVER popularity.
 */

export type TargetTierFilter = "all" | "community" | "official";

export const TARGET_TIER_OPTIONS: readonly {
  key: TargetTierFilter;
  label: string;
}[] = [
  { key: "all", label: "All target tiers" },
  { key: "community", label: "Community" },
  { key: "official", label: "Official" },
];

export type TimeRangeFilter = "any" | "last_7_days" | "last_30_days";

export const TIME_RANGE_OPTIONS: readonly {
  key: TimeRangeFilter;
  label: string;
}[] = [
  { key: "any", label: "Any date" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "last_30_days", label: "Last 30 days" },
];

export const FIFO_NOTE = "Oldest first — clear the queue in order";

export const START_REVIEW_LABEL = "Start review";

export type TargetTier = "community" | "official";

export function countLabel(n: number): string {
  return `${n} submission${n === 1 ? "" : "s"} pending`;
}
