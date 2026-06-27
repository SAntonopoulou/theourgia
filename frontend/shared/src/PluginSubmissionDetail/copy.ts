/**
 * PluginSubmissionDetail — H10 Cluster A4 surface copy.
 *
 * Rule 49 — actor names render human-readably ("@sophia" / "you" /
 * "the system"); UUIDs do not appear.
 */

export const HEADERS = {
  changesRequestedTitle: "What needs to change before this can be accepted",
  changesRequestedSubtitle: "From the reviewing maintainer, verbatim.",
  timeline: "Timeline",
  capabilities: "Capabilities",
} as const;

export const BUTTONS = {
  resubmitWithChanges: "Resubmit with changes",
  withdraw: "Withdraw submission",
} as const;

export const WITHDRAW_HINT =
  "Withdrawing tombstones this submission. Existing installs keep working.";

export type TimelineDotTone =
  | "accent"
  | "warn"
  | "peer-ok"
  | "ink-mute";

export interface TimelineEntry {
  label: string;
  /** "4 days ago · maintainer" / "today · you" / etc. */
  meta: string;
  tone: TimelineDotTone;
}

export interface CapabilityChip {
  label: string;
  wireKey: string;
}
