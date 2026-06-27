/**
 * AgentRunMonitor — H10 Cluster C7 surface copy.
 *
 * Rule 55 — activity stream renders in human-readable terms by
 * default. Raw MCP trace is behind a "View raw activity" toggle,
 * OFF by default.
 *
 * Rule 56 — halt CTA in --warn-soft chrome.
 */

export const HEADERS = {
  liveActivity: "Live activity",
  tokensSoFar: "Tokens so far",
  freshResume: "Fresh / resume",
} as const;

export const TOGGLES = {
  viewRawActivity: "View raw activity",
} as const;

export const BUTTONS = {
  halt: "Halt this run",
} as const;

export type ActivityRowTone = "done" | "live" | "pending";

export interface HumanActivityRow {
  /** Rule 55 — human-readable sentence. */
  text: string;
  tone: ActivityRowTone;
}
