/**
 * RegistryReviewDetail — H10 Cluster A6 surface copy.
 *
 * Rule 44 — verification panel is READ-ONLY; failing checks cannot be
 * bypassed. Accept-as-Official requires an explicit acknowledgement
 * checkbox with the verbatim copy below.
 */

export const HEADERS = {
  automaticVerification: "Automatic verification",
  diff: "Diff",
  manifestSource: "Manifest & source",
  reviewerNotes: "Reviewer notes",
} as const;

export const VERIFICATION_SUBTITLE =
  "Read-only — a failing check cannot be bypassed.";

export const NOTES_PLACEHOLDER =
  "Notes shown verbatim to the author…";

export const ACK_COPY =
  "I have reviewed the source code, the migration history, the capability declarations, and the test coverage. This plugin meets the Official-tier bar.";

export const DECISION_LABELS = {
  requestChanges: "Request changes",
  acceptCommunity: "Accept as Community",
  acceptOfficial: "Accept as Official",
} as const;

export const FIRST_SUBMISSION_NOTE = "First submission — full review required.";

export type CheckKey =
  | "signature"
  | "license"
  | "capabilities"
  | "extension_points";

export interface VerificationCheck {
  key: CheckKey;
  label: string;
  ok: boolean;
}

export type DiffEntryKind = "added" | "removed" | "unchanged";

export interface DiffEntry {
  kind: DiffEntryKind;
  label: string;
  wireKey: string;
  consequence?: string;
}
