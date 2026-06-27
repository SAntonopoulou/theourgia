/**
 * HubMemberDashboard — admin route at ``/hubs/:hubId``.
 *
 * Renders the H08 §S3 Cluster A surface 6 against fixtures. The
 * data set mirrors the .dc.html demo state (2 days · 3 feed
 * items · 4 submissions across all four status values · 1 of 4
 * sharing toggles on to surface the "on" chrome).
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/hubs/{id}/feed — replaces FEED_DAYS.
 *   * GET /api/v1/hubs/{id}/submissions?mine=true — replaces
 *     SUBMISSIONS.
 *   * POST /api/v1/hubs/{id}/submissions/{itemId}/withdraw —
 *     fires on Withdraw click.
 *   * GET/PUT /api/v1/hubs/{id}/sharing-settings — replaces the
 *     sharingState fixture; ALL FOUR DEFAULT FALSE per rule 28.
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type HubFeedDay,
  HubMemberDashboardSurface,
  type HubMySubmission,
  type HubSharingToggle,
  useTopbar,
} from "@theourgia/shared";

const FEED_DAYS: HubFeedDay[] = [
  {
    label: "Today",
    items: [
      {
        id: "f-1",
        did: "did:theourgia:terra.example:diotima",
        kind: "working",
        time: "2h ago",
        preview:
          "Pushed: a dark-moon Deipnon at the shared stone. The lamp held all night.",
      },
      {
        id: "f-2",
        did: "did:theourgia:aurora.example:soror-aurora",
        kind: "divination",
        time: "5h ago",
        preview: "Pushed: a three-card draw on the hub's spring working.",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        id: "f-3",
        did: "did:theourgia:hearth.sophia.example:frater-h",
        kind: "publication",
        time: "18:40",
        preview:
          "Pushed: notes toward a shared egregore — for the hub library.",
      },
    ],
  },
];

const SUBMISSIONS: HubMySubmission[] = [
  {
    id: "s-1",
    title: "Dark-moon Deipnon",
    submitted: "2h ago",
    status: "pending",
  },
  {
    id: "s-2",
    title: "On the Ephesia Grammata",
    submitted: "3 days ago",
    status: "approved",
  },
  {
    id: "s-3",
    title: "A draft, reconsidered",
    submitted: "a week ago",
    status: "sent-back",
  },
  {
    id: "s-4",
    title: "An old working",
    submitted: "2 weeks ago",
    status: "withdrawn",
  },
];

export function HubMemberDashboard() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const [sharingState, setSharingState] = useState<
    Partial<Record<HubSharingToggle, boolean>>
  >({
    // The .dc.html demo state — one of four flipped on so the
    // "on" chrome is visible. Live default is all false per
    // rule 28.
    "push-publications": true,
  });
  useTopbar(() => ({ title: "Hub" }));

  return (
    <HubMemberDashboardSurface
      hubName="The Crossroads Coven"
      monogram="Κ"
      tradition="Hellenic"
      role="officer"
      feedDays={FEED_DAYS}
      submissions={SUBMISSIONS}
      sharingState={sharingState}
      onOpenNewsletter={() =>
        navigate(`/hubs/${hubId ?? ""}/newsletter`)
      }
      onWithdraw={(submissionId) => {
        // TODO Phase 12 — POST withdraw endpoint.
        // eslint-disable-next-line no-console
        console.info("[hub-member] withdraw", submissionId);
      }}
      onSharingToggle={(toggle, next) => {
        setSharingState((prev) => ({ ...prev, [toggle]: next }));
        // TODO Phase 12 — PUT sharing-settings endpoint.
        // eslint-disable-next-line no-console
        console.info("[hub-member] sharing toggle", toggle, next);
      }}
    />
  );
}
