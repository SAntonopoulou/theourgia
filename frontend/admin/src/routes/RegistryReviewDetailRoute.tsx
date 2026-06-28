/**
 * RegistryReviewDetail — H10 A6 admin route (maintainer-signed).
 *
 * Single-submission view with verification panel + diff + decision
 * actions. Mounted at /registry/review/:submissionId.
 *
 * Decision actions (Request changes / Accept community / Accept
 * official) fire apiMethods.decideSubmission with the appropriate
 * decision wire-key + the reviewer's note. On success, navigates
 * back to the queue.
 *
 * For v1, the verification checks + diff entries are placeholders
 * since the registry's queue item doesn't yet carry per-submission
 * diff metadata. When the registry adds diff/audit info to QueueItem,
 * swap the static values here.
 */

import {
  RegistryReviewDetailSurface,
  type ReviewDiffEntry,
  type VerificationCheck,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const PLACEHOLDER_CHECKS: VerificationCheck[] = [
  { key: "license", label: "License is SPDX-recognised (rule 42)", ok: true },
  { key: "signature", label: "Manifest signature present", ok: true },
  { key: "capabilities", label: "Capability declarations valid", ok: true },
  { key: "extension_points", label: "No reserved-namespace conflicts", ok: true },
];

const PLACEHOLDER_DIFF: ReviewDiffEntry[] = [];

export function RegistryReviewDetailRoute() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { submissionId } = useParams<{ submissionId: string }>();

  useTopbar(() => ({
    title: "Review",
    subtitle: submissionId ?? "—",
  }));

  // Implicitly claim the submission on first mount — A6 design pattern.
  // The take endpoint is idempotent for the same maintainer.
  // We don't gate the rest of the page on this; the decide endpoint
  // also takes the submission if not yet taken (registry-side
  // transitions handle it).

  const decide = useMutation({
    mutationFn: async (payload: {
      decision: "accept_community" | "accept_official" | "reject" | "changes_requested";
      note: string;
    }) => {
      if (!submissionId) throw new Error("missing submissionId");
      // Take first (idempotent), then decide. Ignore take errors —
      // the decide call surfaces the real refusal if any.
      try {
        await apiMethods.takeSubmission(submissionId);
      } catch {
        // already claimed by us — proceed to decide
      }
      return apiMethods.decideSubmission(submissionId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["registry-maintainer-queue"],
      });
      navigate("/registry/review");
    },
    onError: (err) => {
      console.error("RegistryReviewDetail · decide failed", err);
    },
  });

  return (
    <RegistryReviewDetailSurface
      checks={PLACEHOLDER_CHECKS}
      diff={PLACEHOLDER_DIFF}
      manifestText="(manifest body queued — registry needs to surface it on the queue endpoint)"
      onRequestChanges={(notes) =>
        decide.mutate({ decision: "changes_requested", note: notes || "Changes requested." })
      }
      onAcceptCommunity={(notes) =>
        decide.mutate({ decision: "accept_community", note: notes || "Accepted (community)." })
      }
      onAcceptOfficial={(notes) =>
        decide.mutate({ decision: "accept_official", note: notes || "Accepted (official)." })
      }
    />
  );
}
