/**
 * MyNetworks · verbatim copy from the H08 designer's
 * `Theourgia My Networks.dc.html`.
 *
 * Every visible string lives here. The empty-state copy is the
 * surface's defining honesty moment ("Hubs are how practitioners
 * federate selectively") and is non-negotiable per the H08 brief.
 */

export const MN_TITLE = "My networks";
export const MN_SUBTITLE =
  "Hubs you're a member of and pending invitations.";

export const MN_DISCOVER_CTA = "Discover hubs";

/** Section eyebrow above the membership list. */
export const MN_ACTIVE_HEADING = "Active hubs";
/** Section eyebrow above the pending-invite list. */
export const MN_PENDING_HEADING = "Pending invitations";

/** Verbatim "Last activity {when}" prefix. */
export const MN_LAST_ACTIVITY_PREFIX = "Last activity ";

/** Verbatim "Invited by {DID}" prefix. */
export const MN_INVITED_BY_PREFIX = "Invited by ";

/** Pending-row action labels. */
export const MN_ACCEPT_LABEL = "Accept";
export const MN_DECLINE_LABEL = "Decline";

/** Empty state — verbatim from the H08 brief and the .dc.html. */
export const MN_EMPTY_TITLE = "No hubs yet";
export const MN_EMPTY_BODY =
  "You don't belong to any hubs yet. Hubs are how practitioners federate selectively — see Discover hubs to find one to join, or set up your own.";
export const MN_EMPTY_CTA = "Discover hubs";

/**
 * The role pill renders the role string lower-case verbatim. The
 * H08 type carries the canonical wire values:
 * ``admin | officer | moderator | member | observer``.
 */
export type HubRole =
  | "admin"
  | "officer"
  | "moderator"
  | "member"
  | "observer";
