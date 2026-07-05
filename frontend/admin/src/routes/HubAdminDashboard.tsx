/**
 * HubAdminDashboard — admin route at ``/hubs/:hubId/admin``.
 *
 * Live-wired against the Phase 12 hub backend:
 *   · GET /hubs/{id} → hubName + publicFace
 *   · GET /hubs/{id}/members → membership rows
 *   · PATCH /hubs/{id} → save public face
 *
 * Curation endpoint is not yet built; the section renders empty
 * until it lands. Analytics opt-in is a local toggle until the
 * sharing-settings endpoint ships.
 */

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AnalyticsOptInDefault,
  type CurationItem,
  HubAdminDashboardSurface,
  type HubMemberRow,
  type HubPublicFaceDraft,
  Toast,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";

interface WireHub {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  membership_policy: string;
  public_banner_url: string | null;
}

interface WireMembership {
  id: string;
  user_id: string;
  hub_id: string;
  role: string;
  created_at: string;
}

const ROLE_MAP: Record<string, HubMemberRow["role"]> = {
  hub_admin: "admin",
  hub_officer: "officer",
  hub_moderator: "moderator",
  hub_member: "member",
  hub_observer: "observer",
};

function membershipToRow(m: WireMembership): HubMemberRow {
  const initial = m.user_id.slice(0, 1).toUpperCase();
  const created = new Date(m.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return {
    initial,
    name: `user ${m.user_id.slice(0, 8)}`,
    did: `did:vault:${m.user_id}`,
    role: ROLE_MAP[m.role] ?? "observer",
    activity: `joined ${created}`,
  };
}


export function HubAdminDashboard() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [analyticsOptIn, setAnalyticsOptIn] =
    useState<AnalyticsOptInDefault>("opt-in");

  const hubQuery = useQuery({
    queryKey: ["hub", hubId],
    queryFn: async () =>
      hubId
        ? ((await apiMethods.getHub(hubId)) as unknown as WireHub)
        : Promise.reject(new Error("No hub id in URL")),
    enabled: !!hubId,
  });

  const membersQuery = useQuery({
    queryKey: ["hub", hubId, "members"],
    queryFn: async () =>
      hubId
        ? ((await apiMethods.listHubMembers(hubId)) as unknown as WireMembership[])
        : [],
    enabled: !!hubId,
  });

  const patchHub = useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      hubId
        ? apiMethods.updateHub(hubId, patch)
        : Promise.reject(new Error("No hub id")),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hub", hubId] }),
    onError: (e) => {
      Toast.push({
        tone: "error",
        title: "Could not save",
        body: e instanceof Error ? e.message : String(e),
      });
    },
  });

  useTopbar(
    () => ({ title: hubQuery.data?.name ?? "Hub admin" }),
    [hubQuery.data?.name],
  );

  const members = useMemo<HubMemberRow[]>(
    () => (membersQuery.data ?? []).map(membershipToRow),
    [membersQuery.data],
  );

  const publicFace: HubPublicFaceDraft = useMemo(
    () => ({
      motto: hubQuery.data?.tagline ?? "",
      description: hubQuery.data?.description ?? "",
      bannerUrl: hubQuery.data?.public_banner_url ?? null,
    }),
    [hubQuery.data],
  );

  // Curation endpoint isn't built yet; empty until it ships.
  const curation: CurationItem[] = [];

  return (
    <HubAdminDashboardSurface
      hubName={hubQuery.data?.name ?? "Hub"}
      members={members}
      curation={curation}
      publicFace={publicFace}
      analyticsOptIn={analyticsOptIn}
      onOpenMyNetworks={() => navigate("/networks")}
      onOpenRoles={() => navigate(`/hubs/${hubId ?? ""}/admin/roles`)}
      onOpenAuditLog={() => navigate(`/hubs/${hubId ?? ""}/admin/audit`)}
      onMemberAction={(did) => {
        Toast.push({
          tone: "info",
          title: "Member actions",
          body: `Kebab menu for ${did.slice(0, 24)}… lands with the member-detail surface.`,
        });
      }}
      onCurationAction={(itemId, action) => {
        Toast.push({
          tone: "info",
          title: "Curation",
          body: `${action} on ${itemId} — endpoint /hubs/{id}/curation not yet built.`,
        });
      }}
      onPublicFaceSave={(draft) => {
        patchHub.mutate({
          tagline: draft.motto,
          description: draft.description,
          public_banner_url: draft.bannerUrl,
        });
      }}
      onAnalyticsOptInChange={(next) => {
        setAnalyticsOptIn(next);
        // Sharing-settings endpoint not yet built.
      }}
    />
  );
}
