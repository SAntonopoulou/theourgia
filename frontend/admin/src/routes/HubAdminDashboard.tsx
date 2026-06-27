/**
 * HubAdminDashboard — admin route at ``/hubs/:hubId/admin``.
 *
 * Renders the H08 §S3 Cluster A surface 4 against fixtures. The
 * data set mirrors the .dc.html demo state (5 members across all
 * 5 roles + 3 curation items: 2 pending + 1 approved).
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/hubs/{id}/members?role= — replaces MEMBERS.
 *   * PATCH /api/v1/hubs/{id}/members/{did} — kebab actions
 *     (change role / suspend / expel — all --warn-soft confirm).
 *   * GET /api/v1/hubs/{id}/curation — replaces CURATION.
 *   * PATCH /api/v1/hubs/{id}/curation/{itemId} { status,
 *     reviewNote? } — approve / send-back / reject.
 *   * PATCH /api/v1/hubs/{id} — public-face commit.
 *   * PUT /api/v1/hubs/{id}/sharing-settings — analytics opt-in
 *     default change.
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type AnalyticsOptInDefault,
  type CurationItem,
  HubAdminDashboardSurface,
  type HubMemberRow,
  type HubPublicFaceDraft,
  useTopbar,
} from "@theourgia/shared";

const MEMBERS: HubMemberRow[] = [
  {
    initial: "A",
    name: "Soror Aurora",
    did: "did:theourgia:aurora.example:soror-aurora",
    role: "admin",
    activity: "today",
  },
  {
    initial: "H",
    name: "Frater Hermes",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    role: "officer",
    activity: "2 days ago",
  },
  {
    initial: "Δ",
    name: "Diotima",
    did: "did:theourgia:terra.example:diotima",
    role: "moderator",
    activity: "4 days ago",
  },
  {
    initial: "Κ",
    name: "K[honoured]",
    did: "did:theourgia:hearth.sophia.example:k",
    role: "member",
    activity: "a week ago",
  },
  {
    initial: "V",
    name: "A. Visitor",
    did: "did:theourgia:aurora.example:visitor",
    role: "observer",
    activity: "3 weeks ago",
  },
];

const CURATION: CurationItem[] = [
  {
    id: "cur-1",
    did: "did:theourgia:terra.example:diotima",
    kind: "entry",
    submitted: "2 hours ago",
    preview:
      "A working at the dark moon — I named the threshold-keeper and the air changed…",
    status: "pending",
  },
  {
    id: "cur-2",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    kind: "divination",
    submitted: "yesterday",
    preview:
      "A three-card draw on the timing of the Deipnon. Past · present · future.",
    status: "pending",
  },
  {
    id: "cur-3",
    did: "did:theourgia:aurora.example:soror-aurora",
    kind: "publication",
    submitted: "3 days ago",
    preview:
      "On the Ephesia Grammata — a short essay for the hub library.",
    status: "approved",
    approvedAt: "2 days ago",
  },
];

const PUBLIC_FACE: HubPublicFaceDraft = {
  motto: "Tending Hekate's lamp, together.",
  description:
    "A hub for practitioners keeping the crossroads. We share workings, compare notes on the Deipnon, and tend a shared egregore.",
  bannerUrl: null,
};

export function HubAdminDashboard() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const [analyticsOptIn, setAnalyticsOptIn] =
    useState<AnalyticsOptInDefault>("opt-in");
  useTopbar(() => ({ title: "Hub admin" }));

  return (
    <HubAdminDashboardSurface
      hubName="The Crossroads Coven"
      members={MEMBERS}
      curation={CURATION}
      publicFace={PUBLIC_FACE}
      analyticsOptIn={analyticsOptIn}
      onOpenMyNetworks={() => navigate("/networks")}
      onOpenRoles={() => navigate(`/hubs/${hubId ?? ""}/admin/roles`)}
      onOpenAuditLog={() => navigate(`/hubs/${hubId ?? ""}/admin/audit`)}
      onMemberAction={(did) => {
        // TODO Phase 12 — open the member-actions menu
        // (Change role / Suspend / Expel / View audit).
        // eslint-disable-next-line no-console
        console.info("[hub-admin] member action", did);
      }}
      onCurationAction={(itemId, action) => {
        // TODO Phase 12 — PATCH /api/v1/hubs/{id}/curation/{itemId}.
        // eslint-disable-next-line no-console
        console.info("[hub-admin] curation action", itemId, action);
      }}
      onPublicFaceSave={(draft) => {
        // TODO Phase 12 — PATCH /api/v1/hubs/{id} with the draft.
        // eslint-disable-next-line no-console
        console.info("[hub-admin] save public face", draft);
      }}
      onAnalyticsOptInChange={(next) => {
        setAnalyticsOptIn(next);
        // TODO Phase 12 — PUT
        // /api/v1/hubs/{id}/sharing-settings with the new policy.
        // eslint-disable-next-line no-console
        console.info("[hub-admin] analytics opt-in changed", next);
      }}
    />
  );
}
