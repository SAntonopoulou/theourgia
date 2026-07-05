/**
 * PluginSubmissionDetail — H10 A4 admin route (live, author-signed).
 *
 * Reads one submission via the signed bridge. The reviewer-notes
 * block + timeline derive from the submission's lifecycle metadata
 * (the registry returns `decided_at`, `submitted_at`, `status` per
 * submission; for v1 we synthesise a minimal timeline from those).
 *
 * Mounted at /registry/submissions/:submissionId.
 */

import {
  type DetailCapabilityChip,
  PluginSubmissionDetailSurface,
  type TimelineDotTone,
  type TimelineEntry,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function timelineFor(submission: {
  status: string;
  submitted_at: string;
  decided_at: string | null;
}): TimelineEntry[] {
  const t: TimelineEntry[] = [
    {
      label: "Submitted",
      meta: new Date(submission.submitted_at).toLocaleString(),
      tone: "accent",
    },
  ];
  if (submission.decided_at) {
    const isAccept = submission.status.startsWith("accepted_");
    const isReject = submission.status === "rejected";
    let tone: TimelineDotTone = "accent";
    let label = "Decided";
    if (isAccept) {
      tone = "peer-ok";
      label = `Accepted (${submission.status.replace("accepted_", "")})`;
    } else if (isReject) {
      tone = "warn";
      label = "Rejected";
    } else if (submission.status === "changes_requested") {
      tone = "warn";
      label = "Changes requested";
    } else if (submission.status === "under_review") {
      tone = "ink-mute";
      label = "Under review";
    }
    t.push({
      label,
      meta: new Date(submission.decided_at).toLocaleString(),
      tone,
    });
  }
  return t;
}

export function PluginSubmissionDetailRoute() {
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();

  useTopbar(() => ({
    title: "Submission",
    subtitle: submissionId ?? "—",
  }));

  const query = useQuery({
    queryKey: ["registry-author-submission", submissionId],
    queryFn: async () => {
      if (!submissionId) throw new Error("missing submissionId");
      return apiMethods.getMySubmission(submissionId);
    },
    enabled: Boolean(submissionId),
    staleTime: 30_000,
  });

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!query.data) return [];
    return timelineFor(query.data);
  }, [query.data]);

  // The registry's per-submission GET doesn't yet return capabilities
  // separately — for v1 we render an empty list with a caption noting
  // this. When the registry adds `capabilities` to the SubmissionRead,
  // map them here.
  const capabilities: DetailCapabilityChip[] = [];
  const canWithdraw =
    query.data?.status === "pending_review"
    || query.data?.status === "under_review";

  return (
    <PluginSubmissionDetailSurface
      timeline={timeline}
      capabilities={capabilities}
      capabilityHint={
        query.data ? `Version ${query.data.version} · ${query.data.license_spdx}` : undefined
      }
      canWithdraw={canWithdraw}
      resubmitHref={
        query.data?.status === "changes_requested"
          ? "/registry/submit"
          : undefined
      }
      onResubmit={() => navigate("/registry/submit")}
      onWithdraw={() => {
        Toast.push({
          tone: "info",
          title: "Withdraw not wired",
          body: "The registry doesn't yet expose a submitter-side withdraw endpoint — the state exists but only maintainers can transition to it.",
        });
      }}
    />
  );
}
