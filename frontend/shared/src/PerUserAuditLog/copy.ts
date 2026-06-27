/**
 * PerUserAuditLog — H10 Cluster B4 surface copy.
 *
 * Rule 49 — UUIDs hidden by default; per-row "view raw" toggle reveals
 * the full event payload.
 */

export const PREAMBLE =
  "Every action taken on your account, in plain words. This log exists so you can hold the system accountable — it records what you did, what your agents did, and what the system did on your behalf. It never shows another person's activity, and it never reveals sealed content.";

export const ZONE_NOTE_PREFIX = "Times in your local zone";

export type ActorFilter = "all" | "you" | "agents" | "system";

export const ACTOR_OPTIONS: readonly { key: ActorFilter; label: string }[] = [
  { key: "all", label: "All actors" },
  { key: "you", label: "You" },
  { key: "agents", label: "Your agents" },
  { key: "system", label: "The system" },
];

export type KindFilter =
  | "all"
  | "auth"
  | "visibility"
  | "federation"
  | "plugin"
  | "agent"
  | "security";

export const KIND_OPTIONS: readonly { key: KindFilter; label: string }[] = [
  { key: "all", label: "All event kinds" },
  { key: "auth", label: "auth" },
  { key: "visibility", label: "visibility" },
  { key: "federation", label: "federation" },
  { key: "plugin", label: "plugin" },
  { key: "agent", label: "agent" },
  { key: "security", label: "security" },
];

export type TimeRange = "last_30_days" | "last_90_days" | "all_time";

export const TIME_RANGE_OPTIONS: readonly { key: TimeRange; label: string }[] = [
  { key: "last_30_days", label: "Last 30 days" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "all_time", label: "All time" },
];

export type OutcomeKind = "success" | "failure" | "denied";

export const OUTCOME_CHIP_LABELS: Record<OutcomeKind, string> = {
  success: "success",
  failure: "failure",
  denied: "denied",
};
