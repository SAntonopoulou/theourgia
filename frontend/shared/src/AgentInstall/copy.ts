/**
 * AgentInstall — H10 Cluster C3 surface copy.
 *
 * THE worked example for the cluster. Rules 52, 53, 54, 56, 57 are
 * all rendered in the chrome here. The exclusions block (rule 52 + 53)
 * appears BEFORE the capability list. The scroll-gate from H09 is
 * reused. The cost cap is HARD (rule 56). The BYO-key warning is
 * surfaced if no key is configured (rule 57).
 */

export const RULE_52_LINE =
  "This agent will never see content tagged closed-tradition, even with broad scope. Closed-tradition exclusion is non-negotiable.";

export const RULE_53_LINE =
  "Sealed content is zero-knowledge. The agent's daemon has no keys to decrypt it, even at your request.";

export const RULE_56_LINE =
  "A hard cap. When it's reached, the agent declines to wake until the next month or until you raise it. There is no silent override.";

export const SECTION_LABELS = {
  exclusions: "What this agent will never see",
  capabilities: "Capabilities it requests",
  memoryDir: "Memory directory",
  costCap: "Monthly cost cap",
} as const;

export const MEMORY_DIR_HINT =
  "The agent keeps its notes here. You can read, edit, or archive any of them under Memory.";

export const NO_KEY_BANNER =
  "An API key is required before this agent can run. You can install now — the agent stays inactive — and configure your key afterward.";

export const GATE_NOTES = {
  scrollFirst: "Scroll through the capabilities to continue",
  capRequired: "Set a monthly cost cap",
  reviewed: "Reviewed",
} as const;

export const BUTTONS = {
  cancel: "Cancel",
  install: "Install agent",
  installInactive: "Install (stays inactive)",
} as const;

export interface AgentCapabilityChip {
  /** Plain-language label, e.g., "Read your divination sessions". */
  label: string;
  /** Wire key, e.g., "read.entries". */
  wireKey: string;
  /** Consequence text below the row. */
  note: string;
}
