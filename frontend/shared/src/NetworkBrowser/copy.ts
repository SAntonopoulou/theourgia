/**
 * NetworkBrowser · verbatim copy from H08
 * `Theourgia Network Browser.dc.html`.
 */

export const NB_TITLE = "Network browser";
export const NB_SUBTITLE =
  "The peer instances your instance has handshaked with";

/** Filter rail eyebrows. */
export const NB_FILTER_STATUS_LABEL = "Handshake status";
export const NB_FILTER_TRADITION_LABEL = "Tradition";

/** The four handshake states + their user-facing labels. */
export const NB_STATUS_LABELS = {
  successful: "Successful",
  pending: "Pending",
  refused: "Refused",
  blocked: "Blocked",
} as const;

export type HandshakeState = keyof typeof NB_STATUS_LABELS;

export const NB_STATUS_KEYS: readonly HandshakeState[] = [
  "successful",
  "pending",
  "refused",
  "blocked",
];

/** Local-pinned instance row. */
export const NB_LOCAL_PILL = "This is your instance";

/** Trust-ledger band copy. */
export const NB_TRUST_TITLE = "Subscribe to a community blocklist (opt-in)";
export const NB_TRUST_NOT_SUBSCRIBED =
  "Not subscribed. A blocklist is a community-maintained set of instances to refuse.";
export const NB_TRUST_CTA = "Configure";

/** Per-row meta prefix. */
export const NB_HEARTBEAT_PREFIX = "last heartbeat ";
