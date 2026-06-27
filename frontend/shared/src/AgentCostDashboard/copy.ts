/**
 * AgentCostDashboard — H10 Cluster C10 surface copy.
 *
 * Rule 58 — per-agent + per-session breakdown · fresh/resume split is
 * first-class. Quiet stats per rule 9.
 */

export const HEADERS = {
  monthCost: "This month · cost",
  monthTokens: "This month · tokens",
  perAgent: "Per agent",
  historyLabel: "Cost over the last 12 months",
} as const;

export const COL_LABELS = {
  agent: "Agent",
  cost: "Cost",
  tokens: "Tokens",
  freshResume: "Fresh / resume",
  cap: "Cap",
} as const;

export const ACROSS_ALL_AGENTS = "across all agents";

export interface TokenBreakdown {
  in_: number;
  out_: number;
  cache: number;
}

export type AgentRowKind =
  | "divination"
  | "synchronicity"
  | "study"
  | "correspondence"
  | "ritual"
  | "archivist";
