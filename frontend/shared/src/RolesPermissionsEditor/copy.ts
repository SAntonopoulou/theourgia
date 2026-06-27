/**
 * RolesPermissionsEditor · verbatim copy + capability surface from H08
 * `Theourgia Roles Permissions Editor.dc.html`.
 */

export const RPE_BREADCRUMB_TAIL = "Roles & permissions";
export const RPE_LAST_CHANGED_PREFIX = "Last changed ";
export const RPE_LAST_CHANGED_BY = " by ";

/** Topbar preview-as select. */
export const RPE_PREVIEW_AS_LABEL = "Preview as role";
export const RPE_PREVIEW_AS_PLACEHOLDER = "Preview as role…";

/** Footer CTAs. */
export const RPE_ADD_CUSTOM_ROLE = "Add custom role";
export const RPE_APPLY_TEMPLATE_LABEL = "Apply a template";
export const RPE_APPLY_TEMPLATE_PLACEHOLDER = "Apply a template…";
export const RPE_SAVE_CHANGES = "Save changes";
export const RPE_SAVE_AND_APPLY = "Save + apply";

/** Templates. */
export const RPE_TEMPLATES = [
  "Coven",
  "Lodge",
  "Study group",
  "Scholarly working group",
] as const;
export type RpeTemplate = (typeof RPE_TEMPLATES)[number];

/**
 * The eleven capabilities a hub role can be granted. The list is
 * deliberately fixed by H08 — plugins extend via their own role
 * surfaces, never by mutating this matrix. Wire keys are stable;
 * UI labels are user-facing copy.
 */
export type HubCapabilityKey =
  | "edit_hub_content"
  | "moderate_submissions"
  | "manage_members"
  | "send_newsletters"
  | "run_analytics_queries"
  | "accept_federation_peers"
  | "edit_role_definitions"
  | "manage_permission_matrix"
  | "view_audit_log"
  | "schedule_group_rituals"
  | "approve_curation_submissions";

/** Display label per capability, in matrix column order. */
export const RPE_CAPABILITIES: ReadonlyArray<
  readonly [HubCapabilityKey, string]
> = [
  ["edit_hub_content", "Edit hub content"],
  ["moderate_submissions", "Moderate submissions"],
  ["manage_members", "Manage members"],
  ["send_newsletters", "Send newsletters"],
  ["run_analytics_queries", "Run analytics queries"],
  ["accept_federation_peers", "Accept federation peers"],
  ["edit_role_definitions", "Edit role definitions"],
  ["manage_permission_matrix", "Manage permission matrix"],
  ["view_audit_log", "View audit log"],
  ["schedule_group_rituals", "Schedule group rituals"],
  ["approve_curation_submissions", "Approve curation submissions"],
];

/** Permission-denied banner.
 *
 *   "You cannot do {action} because you lack permission {permission}."
 *
 * The string is rendered verbatim with two-slot interpolation —
 * never refactored into "Sorry, …" or any softening pre-amble. */
export const RPE_DENIED_TEMPLATE = (action: string, permission: string) =>
  `You cannot do ${action} because you lack permission ${permission}.`;

export const RPE_DENIED_REQUEST_LINK = "How to request this permission";

/** Role action kebab — handled by the consumer. */
export const RPE_ROLE_ACTIONS_LABEL = "Role actions";
