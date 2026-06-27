/**
 * AgentCapabilityReview — H10 Cluster C4 surface copy.
 *
 * Modal · used from C3 (install) and from update prompts. Rules 31,
 * 52, 53 govern. New-on-update capabilities highlighted in
 * --warn-soft above the already-granted set.
 */

export const TITLE = "Capability review";

export const SECTION_LABELS = {
  newInUpdate: "New in this update",
  alreadyGranted: "Already granted",
  neverVisible: "Never visible to this agent",
} as const;

export const RULE_52_LINE =
  "This agent will never see content tagged closed-tradition, even with broad scope. Closed-tradition exclusion is non-negotiable.";

export const RULE_53_LINE =
  "Sealed content is zero-knowledge. The agent's daemon has no keys to decrypt it, even at your request.";

export const GATE_NOTES = {
  scrollFirst: "Scroll to review every capability",
  reviewed: "Reviewed",
} as const;

export const SCROLL_HINTS = {
  pending: "Scroll to review all capabilities",
  done: "You have reviewed every capability",
} as const;

export const BUTTONS = {
  cancel: "Cancel",
  approve: "Approve",
  approveUpdate: "Approve update",
} as const;

export type CapabilityReviewScenario = "install" | "update";

export interface AgentCapabilityRow {
  label: string;
  wireKey: string;
  note: string;
}
