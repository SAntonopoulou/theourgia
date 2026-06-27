/**
 * AgentTaskComposer — H10 Cluster C6 surface copy.
 *
 * Rule 51 — magician initiates; agent never speaks first. This is
 * the entry point. The placeholder + hint use rule-54 tone:
 * "surface", "draw your attention to" — NEVER "interpret"/"tell you".
 *
 * Rule from the design: scope NEVER WIDENS — the parent supplies
 * the agent's granted scope options + a few task-narrowing variants.
 */

export const HEADERS = {
  task: "Your task",
  scope: "Scope for this task",
} as const;

export const SCOPE_HINT =
  "Narrow what the agent sees for this run. You can restrict its granted access, never widen it.";

export const TASK_HINT =
  "Try: “surface the cards that have returned across my dark-moon workings,” or “draw my attention to figures that appear in both my dreams and my divination.”";

export const START_LABEL = "Start task";

export interface ScopeOption {
  /** Stable id passed to the parent on submit. */
  id: string;
  /** Display label. */
  label: string;
}
