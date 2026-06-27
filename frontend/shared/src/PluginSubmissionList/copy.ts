/**
 * PluginSubmissionList — H10 Cluster A3 surface copy.
 *
 * Rule 41 — NO "promote to Official" affordance on the author dashboard.
 * Rule 40 — rejected/withdrawn entries remain (tombstone, never deleted).
 */

export const PREAMBLE =
  "Your submissions, most recent first. Submissions are never removed from this list — rejected and withdrawn entries remain for the record.";

export type SubmissionState =
  | "pending_review"
  | "under_review"
  | "changes_requested"
  | "accepted_community"
  | "accepted_official"
  | "rejected"
  | "withdrawn";

export const STATE_LABELS: Record<SubmissionState, string> = {
  pending_review: "Pending review",
  under_review: "Under review",
  changes_requested: "Changes requested",
  accepted_community: "Accepted (Community)",
  accepted_official: "Accepted (Official)",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
