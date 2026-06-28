/**
 * RegistryReviewQueue — H10 A5 admin route (maintainer-signed).
 *
 * Lists pending + under-review submissions across the registry.
 * Maintainer-key signing is server-side via
 * `THEOURGIA_MAINTAINER_DID` + key path; when unset, the bridge
 * returns 503 with verbatim "maintainer identity not configured".
 *
 * Mounted at /registry/review.
 */

import {
  RegistryReviewQueueSurface,
  type ReviewQueueRow,
  type ReviewTimeRangeFilter,
  type TargetTier,
  type TargetTierFilter,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Math.max(0, Date.now() - then);
  const days = Math.floor(delta / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}

export function RegistryReviewQueueRoute() {
  const navigate = useNavigate();
  const [targetTier, setTargetTier] = useState<TargetTierFilter>("all");
  const [extensionPoint, setExtensionPoint] = useState("");
  const [timeRange, setTimeRange] = useState<ReviewTimeRangeFilter>("any");

  useTopbar(() => ({
    title: "Review queue",
    subtitle: "Pending + under review · oldest first",
  }));

  const query = useQuery({
    queryKey: ["registry-maintainer-queue"],
    queryFn: async () => apiMethods.reviewQueue(),
    staleTime: 30_000,
  });

  const rows = useMemo<ReviewQueueRow[]>(() => {
    const items = query.data?.queue ?? [];
    // For v1, the queue rows don't carry target tier explicitly; we
    // infer "community" (lower trust) since brand-new submissions
    // default to that path. When the registry adds explicit
    // target_tier to QueueItem, swap here.
    return items.map<ReviewQueueRow>((q) => ({
      id: q.submission_id,
      name: q.plugin_name,
      version: q.version,
      authorHandle: q.author_did,
      submittedAt: relativeTime(q.submitted_at),
      targetTier: "community" as TargetTier,
      capabilityCount: q.capabilities.length,
      manifestParses: true,
    }));
  }, [query.data]);

  return (
    <RegistryReviewQueueSurface
      rows={rows}
      targetTier={targetTier}
      extensionPoint={extensionPoint}
      timeRange={timeRange}
      onTargetTierChange={setTargetTier}
      onExtensionPointChange={setExtensionPoint}
      onTimeRangeChange={setTimeRange}
      onStartReview={(id) => navigate(`/registry/review/${encodeURIComponent(id)}`)}
    />
  );
}
