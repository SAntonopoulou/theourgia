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
import { useQuery } from "@tanstack/react-query";

import {
  type HubFeedDay,
  HubMemberDashboardSurface,
  type HubMySubmission,
  type HubSharingToggle,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";

// Hub feed endpoint not yet built. Empty until it ships.
const FEED_DAYS: HubFeedDay[] = [];

// Hub submissions endpoint not yet built. Empty until it ships.
const SUBMISSIONS: HubMySubmission[] = [];

interface WireHub {
  id: string;
  name: string;
  tagline: string | null;
  public_tradition_tags: string[];
}

export function HubMemberDashboard() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const [sharingState, setSharingState] = useState<
    Partial<Record<HubSharingToggle, boolean>>
  >({
    // Live default is all false per rule 28 — no fixture flipped
    // "on" chrome; the surface renders honest defaults.
  });

  const hubQuery = useQuery({
    queryKey: ["hub", hubId],
    queryFn: async () =>
      hubId
        ? ((await apiMethods.getHub(hubId)) as unknown as WireHub)
        : Promise.reject(new Error("No hub id in URL")),
    enabled: !!hubId,
  });

  useTopbar(() => ({ title: hubQuery.data?.name ?? "Hub" }), [hubQuery.data?.name]);

  const hub = hubQuery.data;
  const monogram = hub?.name?.[0]?.toUpperCase() ?? "·";
  const tradition = hub?.public_tradition_tags?.[0] ?? "—";

  return (
    <HubMemberDashboardSurface
      hubName={hub?.name ?? "Hub"}
      monogram={monogram}
      tradition={tradition}
      role="member"
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
