/**
 * FederationAuditLog · verbatim copy + event taxonomy from H08
 * `Theourgia Federation Audit Log.dc.html`.
 *
 * Append-only ledger of federation events. The frontend never
 * mutates or hides rows — only filters the *view*. Underlying
 * data is read-only and signed.
 */

export const FAL_PAGE_TITLE = "Audit log";
export const FAL_HUB_SUFFIX = " · Admin";

/** Filter rail labels. */
export const FAL_LABEL_ACTOR = "Actor";
export const FAL_LABEL_EVENT_TYPE = "Event type";
export const FAL_LABEL_TIME_RANGE = "Time range";
export const FAL_TOGGLE_MINE = "Show only my actions";

/** Time-range options (display labels). */
export const FAL_TIME_RANGES = [
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "All time",
] as const;
export type FalTimeRange = (typeof FAL_TIME_RANGES)[number];

/** Main band heading + zone disclosure. */
export const FAL_ZONE_DISCLOSURE_PREFIX =
  "Times shown in your local zone (";
export const FAL_ZONE_DISCLOSURE_SUFFIX = ")";

/** Per-row expansion. */
export const FAL_SIGNED_ENVELOPE_LABEL = "Signed envelope";

/** Empty-state copy — verbatim. */
export const FAL_EMPTY_TITLE = "Nothing in this slice of the record.";
export const FAL_EMPTY_BODY =
  "Loosen the actor, event-type, or time filters to see more.";

/** Export band. */
export const FAL_EXPORT_TITLE = "Export filtered view";
export const FAL_EXPORT_BODY_SUFFIX =
  ", with the current filters, as a CSV of signed envelopes.";
export const FAL_EXPORT_CTA = "Export CSV";

/** Event-type taxonomy. The wire keys are stable — these names
 *  match the federation-event log on the server.
 *
 *  Tone families (H08 rule 26 — colour the affect, not the
 *  verdict):
 *
 *    network → Push, Pull, Invite, RitualSchedule, RitualUpdate
 *    remote  → Mirror, Comment, Heartbeat
 *    peer-ok → Accept
 *    warn    → Revoke
 *
 *  No event carries `--danger` chrome. Revoke is `--warn` because
 *  it is a consequential edit, not a fault.
 */
export type FalEventKey =
  | "Push"
  | "Pull"
  | "Mirror"
  | "Invite"
  | "Accept"
  | "Revoke"
  | "RitualSchedule"
  | "RitualUpdate"
  | "Comment"
  | "Heartbeat";

export const FAL_EVENT_KEYS: readonly FalEventKey[] = [
  "Push",
  "Pull",
  "Mirror",
  "Invite",
  "Accept",
  "Revoke",
  "RitualSchedule",
  "RitualUpdate",
  "Comment",
  "Heartbeat",
];

export type FalEventTone = "network" | "remote" | "peer-ok" | "warn";

export const FAL_EVENT_TONES: Record<FalEventKey, FalEventTone> = {
  Push: "network",
  Pull: "network",
  Mirror: "remote",
  Invite: "network",
  Accept: "peer-ok",
  Revoke: "warn",
  RitualSchedule: "network",
  RitualUpdate: "network",
  Comment: "remote",
  Heartbeat: "remote",
};
