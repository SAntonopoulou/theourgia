/**
 * HubAdmin · verbatim copy from H08
 * `Theourgia Hub Admin Dashboard.dc.html`.
 */

/** Tab labels in the .dc.html's order. */
export const HA_TAB_LABELS = {
  members: "Members",
  curation: "Curation queue",
  public: "Public face",
  settings: "Settings",
} as const;

export type HubAdminTab = keyof typeof HA_TAB_LABELS;

export const HA_TAB_KEYS: readonly HubAdminTab[] = [
  "members",
  "curation",
  "public",
  "settings",
];

/** Breadcrumb separator (one of the few hard-coded glyphs the
 *  H08 .dc.html commits to). */
export const HA_BREADCRUMB_ROOT = "My networks";
export const HA_BREADCRUMB_ADMIN_SUFFIX = " · admin";

/** Role filter chips (Members tab). "All" + the five canonical
 *  hub roles. */
export const HA_ROLE_FILTERS: readonly string[] = [
  "All",
  "admin",
  "officer",
  "moderator",
  "member",
  "observer",
];

/** Members table column headers. */
export const HA_COL_MEMBER = "Member";
export const HA_COL_ROLE = "Role";
export const HA_COL_LAST_ACTIVITY = "Last activity";

/** Curation queue — per-item action labels (verbatim). */
export const HA_CURATION_APPROVE = "Approve";
export const HA_CURATION_SEND_BACK = "Send back with note";
export const HA_CURATION_REJECT = "Reject";

/** Pill rendered on already-approved curation items. */
export const HA_APPROVED_PREFIX = "Approved · ";

/** Public-face editor strings (verbatim). */
export const HA_PUBLIC_HEADER =
  "Edit how this hub appears to non-members. Changes preview here; nothing is published until you commit.";
export const HA_PUBLIC_BANNER_LABEL = "Banner image";
export const HA_PUBLIC_BANNER_UPLOAD = "Upload banner";
export const HA_PUBLIC_MOTTO_LABEL = "Hub motto";
export const HA_PUBLIC_DESCRIPTION_LABEL = "Description";
export const HA_PUBLIC_PUBLISH_CTA = "Publish public face changes";

/** Settings tab strings. */
export const HA_SETTINGS_ANALYTICS_HEADING = "Analytics opt-in default";

/** Three radio options for the analytics-opt-in default. The values
 *  match the H08 supplement's expected wire format. */
export type AnalyticsOptInDefault = "opt-in" | "opt-out" | "require-explicit";

export const HA_ANALYTICS_OPTIONS: ReadonlyArray<{
  key: AnalyticsOptInDefault;
  label: string;
}> = [
  { key: "opt-in", label: "Opt-in by default" },
  { key: "opt-out", label: "Opt-out by default" },
  { key: "require-explicit", label: "Always require explicit consent" },
];

export const HA_SETTINGS_ROLES_LINK = "Roles & permissions →";
export const HA_SETTINGS_AUDIT_LINK = "Audit log →";

/** "Last changed {when} by {actor}" line on the matrix surface
 *  (used by surface 12 — kept here so the canonical formatter
 *  lives next to the surface that uses it). Reserved for that
 *  later batch. */
export const HA_LAST_CHANGED_PREFIX = "Last changed ";
export const HA_LAST_CHANGED_BY = " by ";
