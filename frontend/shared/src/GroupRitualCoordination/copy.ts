/**
 * GroupRitualCoordination · verbatim copy from H08
 * `Theourgia Group Ritual Coordination.dc.html`.
 */

/** Section eyebrows. */
export const GRC_PARTICIPANTS_HEADING = "Participants";
export const GRC_SCRIPT_HEADING = "Shared script";
export const GRC_FRAGMENTS_HEADING = "Fragments";

/** Status badges in the header. */
export type GroupRitualStatus =
  | "countdown"
  | "in-progress"
  | "completed";

export const GRC_STATUS_LABELS: Record<GroupRitualStatus, string> = {
  countdown: "Starts soon",
  "in-progress": "Ritual in progress",
  completed: "Completed",
};

/** Per-participant presence states. The wire enum mirrors the
 *  H08 supplement's RitualParticipantState. */
export type GroupRitualPresence =
  | "not-present"
  | "joined"
  | "in-ritual"
  | "completed";

export const GRC_PRESENCE_LABELS: Record<GroupRitualPresence, string> = {
  "not-present": "Not yet present",
  joined: "Joined",
  "in-ritual": "In ritual",
  completed: "Completed",
};

/** Sticky footer copy. */
export const GRC_FRAGMENT_PLACEHOLDER = "Post a fragment…";
export const GRC_MARK_COMPLETED = "Mark me as completed";
