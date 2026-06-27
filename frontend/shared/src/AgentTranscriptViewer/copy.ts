/**
 * AgentTranscriptViewer — H10 Cluster C8 surface copy.
 *
 * The transcript is IMMUTABLE after a run completes. Footer message
 * locked verbatim.
 */

export const IMMUTABLE_FOOTER =
  "End of transcript · this record is immutable.";

export const META_LABELS = {
  detail: "detail",
  hideDetail: "hide detail",
  noCalls: "no calls",
} as const;

export type SpeakerKind = "magician" | "agent";

export const SPEAKER_LABEL: Record<SpeakerKind, string> = {
  magician: "You",
  // Parent overrides this when the agent has a specific name
  // ("Divination companion" etc.).
  agent: "Agent",
};
