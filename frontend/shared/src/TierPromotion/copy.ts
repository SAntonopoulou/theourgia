/**
 * TierPromotion — H10 Cluster A7 surface copy.
 *
 * Community → Official promotion. Manual checklist + justification.
 * The Promote button is gated on every manual item being ticked
 * AND every auto check passing (rule 41 — never auto-promoted).
 */

export const HEADERS = {
  communityPlugin: "Community plugin",
  promotionChecklist: "Promotion checklist",
  justification: "Justification",
} as const;

export const CHECKLIST_SUBTITLE =
  "Automatic checks are read-only. Tick the manual ones once you've confirmed them.";

export const JUSTIFICATION_SUBTITLE =
  "Public-facing — appears on the plugin's page as “‡ Promoted to Official on {date}.”";

export const JUSTIFICATION_PLACEHOLDER =
  "Why this plugin earns the Official tier…";

export const PROMOTE_LABEL = "Promote to Official";
export const CHANGE_PLUGIN_LABEL = "Change";

export const GATE_NOTE = {
  ready: "Every check satisfied",
  blocked: "Confirm every manual check to promote",
} as const;

export type ChecklistItemKey = "automatic" | "manual";

export interface ChecklistItem {
  /** Stable id, used as the React key + the manual-check toggle id. */
  id: string;
  label: string;
  /** automatic — read-only · cannot be toggled. manual — checkbox. */
  kind: ChecklistItemKey;
  /** For automatic items: must be supplied by the parent. */
  satisfied: boolean;
}
