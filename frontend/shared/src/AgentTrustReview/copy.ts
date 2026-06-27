/**
 * AgentTrustReview — H10 Cluster C12 surface copy.
 *
 * Renew + per-capability revoke + uninstall (memory preserved by
 * default; explicit "also delete memory" checkbox per rule 59).
 */

export const HEADERS = {
  capabilitiesChanged: "Capabilities changed since you installed it",
  currentCapabilities: "Current capabilities",
  uninstall: "Uninstall",
} as const;

export const SUBTITLES = {
  currentCapabilities: "Turn off any capability without uninstalling the agent.",
} as const;

export const RENEW_TILE = {
  title: "Renew your approval",
  hint:
    "Affirm you are still comfortable with the current set. Logged to your audit record.",
} as const;

export const DELETE_MEMORY_LABEL_MAIN =
  "Also delete this agent's memory.";
export const DELETE_MEMORY_LABEL_HINT =
  "By default, memory is preserved so you can reinstall and resume.";

export const BUTTONS = {
  renew: "Renew approval",
  uninstall: "Uninstall agent",
} as const;

export function diffNoticeLine(addedLabel: string, addedKey: string): string {
  return `An update added ${addedLabel} (${addedKey}). Review it below before you renew.`;
}

export interface CurrentCapabilityRow {
  /** Stable id for tracking the on/off state per-cap. */
  id: string;
  label: string;
  wireKey: string;
  /** Highlight as "new since install" — renders in --warn-soft chrome
   *  with a 'new' tag. */
  isNew?: boolean;
}
