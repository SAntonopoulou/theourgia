/**
 * PluginSubmissionList — H10 A3 admin route (live, author-signed).
 *
 * Reads the author's own submissions via the signed bridge endpoint
 * (`GET /api/v1/registry/author/submissions`). The vault holds the
 * Ed25519 keypair; the admin SPA never touches the private key.
 *
 * Mounted at /registry/submissions.
 */

import {
  PluginSubmissionListSurface,
  type SubmissionRow,
  type SubmissionState,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function stateOf(status: string): SubmissionState {
  const known: SubmissionState[] = [
    "pending_review",
    "under_review",
    "changes_requested",
    "accepted_community",
    "accepted_official",
    "rejected",
    "withdrawn",
  ];
  return (known as string[]).includes(status)
    ? (status as SubmissionState)
    : "pending_review";
}

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
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}

export function PluginSubmissionListRoute() {
  const navigate = useNavigate();

  useTopbar(() => ({
    title: "My submissions",
    subtitle: "Your registry submissions, newest first",
  }));

  const query = useQuery({
    queryKey: ["registry-author-submissions"],
    queryFn: async () => apiMethods.listMySubmissions(),
    staleTime: 30_000,
  });

  const rows = useMemo<SubmissionRow[]>(() => {
    const submissions = query.data?.submissions ?? [];
    return submissions.map<SubmissionRow>((s) => ({
      id: s.id,
      name: s.plugin_name,
      version: s.version,
      submittedAt: relativeTime(s.submitted_at),
      state: stateOf(s.status),
    }));
  }, [query.data]);

  return (
    <PluginSubmissionListSurface
      rows={rows}
      onOpen={(id) => navigate(`/registry/submissions/${encodeURIComponent(id)}`)}
    />
  );
}
