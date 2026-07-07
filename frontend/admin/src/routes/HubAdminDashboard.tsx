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
  ConfirmDialog,
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


type HubRoleWire = "hub_admin" | "hub_officer" | "hub_moderator" | "hub_member" | "hub_observer";

const REVERSE_ROLE_MAP: Record<HubMemberRow["role"], HubRoleWire> = {
  admin: "hub_admin",
  officer: "hub_officer",
  moderator: "hub_moderator",
  member: "hub_member",
  observer: "hub_observer",
};

function didToUserId(did: string): string {
  return did.replace(/^did:vault:/, "");
}

interface MemberActionState {
  memberDid: string;
  action: "promote" | "demote" | "remove" | null;
  currentRole: HubMemberRow["role"];
}

const PROMOTION_LADDER: HubMemberRow["role"][] = [
  "observer",
  "member",
  "moderator",
  "officer",
  "admin",
];

function nextRoleAbove(current: HubMemberRow["role"]): HubMemberRow["role"] | null {
  const i = PROMOTION_LADDER.indexOf(current);
  if (i < 0 || i >= PROMOTION_LADDER.length - 1) return null;
  const nextRole = PROMOTION_LADDER[i + 1];
  return nextRole ?? null;
}

function nextRoleBelow(current: HubMemberRow["role"]): HubMemberRow["role"] | null {
  const i = PROMOTION_LADDER.indexOf(current);
  if (i <= 0) return null;
  const prevRole = PROMOTION_LADDER[i - 1];
  return prevRole ?? null;
}

export function HubAdminDashboard() {
  const { hubId } = useParams<{ hubId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [analyticsOptIn, setAnalyticsOptIn] =
    useState<AnalyticsOptInDefault>("opt-in");
  const [memberAction, setMemberAction] = useState<MemberActionState | null>(null);

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

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: HubRoleWire }) =>
      hubId
        ? apiMethods.changeHubMemberRole(hubId, userId, role)
        : Promise.reject(new Error("No hub id")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hub", hubId, "members"] });
      Toast.push({ tone: "success", title: "Role changed" });
    },
    onError: (e) => {
      Toast.push({
        tone: "error",
        title: "Could not change role",
        body: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) =>
      hubId
        ? apiMethods.removeHubMember(hubId, userId)
        : Promise.reject(new Error("No hub id")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hub", hubId, "members"] });
      Toast.push({ tone: "success", title: "Member removed" });
    },
    onError: (e) => {
      Toast.push({
        tone: "error",
        title: "Could not remove member",
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

  const surface = (
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
        // Open the action dialog. The kebab in the row surfaces this;
        // the dialog offers promote / demote / remove wired to the
        // real Phase 12 hub member endpoints.
        const row = members.find((m) => m.did === did);
        if (!row) return;
        setMemberAction({
          memberDid: did,
          action: null,
          currentRole: row.role,
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

  return (
    <>
      {surface}
      <MemberActionDialog
        state={memberAction}
        onClose={() => setMemberAction(null)}
        onPromote={(did) => {
          const above = nextRoleAbove(memberAction?.currentRole ?? "observer");
          if (!above || !memberAction) return;
          changeRole.mutate({
            userId: didToUserId(did),
            role: REVERSE_ROLE_MAP[above]!,
          });
          setMemberAction(null);
        }}
        onDemote={(did) => {
          const below = nextRoleBelow(memberAction?.currentRole ?? "observer");
          if (!below || !memberAction) return;
          changeRole.mutate({
            userId: didToUserId(did),
            role: REVERSE_ROLE_MAP[below]!,
          });
          setMemberAction(null);
        }}
        onRemove={(did) => {
          removeMember.mutate(didToUserId(did));
          setMemberAction(null);
        }}
        busy={changeRole.isPending || removeMember.isPending}
      />
    </>
  );
}

interface MemberActionDialogProps {
  state: MemberActionState | null;
  onClose: () => void;
  onPromote: (did: string) => void;
  onDemote: (did: string) => void;
  onRemove: (did: string) => void;
  busy: boolean;
}

function MemberActionDialog({
  state,
  onClose,
  onPromote,
  onDemote,
  onRemove,
  busy,
}: MemberActionDialogProps) {
  if (!state) return null;
  const above = nextRoleAbove(state.currentRole);
  const below = nextRoleBelow(state.currentRole);

  // Confirm-remove stage
  if (state.action === "remove") {
    return (
      <ConfirmDialog
        open={true}
        title="Remove member from hub?"
        body={`This removes ${state.memberDid.slice(0, 32)}… from the hub. Their past contributions stay; they can be re-invited any time. This does not delete their vault or their content.`}
        confirmLabel={busy ? "Removing…" : "Remove"}
        cancelLabel="Keep"
        tone="constructive"
        onConfirm={() => onRemove(state.memberDid)}
        onCancel={onClose}
      />
    );
  }

  // Root action-picker stage using a plain ConfirmDialog rendered
  // three times isn't ideal, but keeps to the shared primitives. The
  // three actions are surfaced sequentially — promote first, then
  // demote, then remove. The picker itself is a bespoke tiny modal.
  return (
    <ConfirmDialog
      open={true}
      title={`Member · ${state.currentRole}`}
      body={
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 260 }}>
          {above ? (
            <button
              type="button"
              onClick={() => onPromote(state.memberDid)}
              disabled={busy}
              style={{
                padding: "10px 14px",
                textAlign: "left",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Promote to <strong>{above}</strong>
            </button>
          ) : null}
          {below ? (
            <button
              type="button"
              onClick={() => onDemote(state.memberDid)}
              disabled={busy}
              style={{
                padding: "10px 14px",
                textAlign: "left",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Demote to <strong>{below}</strong>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onRemove(state.memberDid)}
            disabled={busy}
            style={{
              padding: "10px 14px",
              textAlign: "left",
              border: "1px solid var(--warn-border)",
              background: "var(--warn-soft)",
              color: "var(--warn)",
              borderRadius: "var(--r-md)",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Remove from hub
          </button>
        </div>
      }
      confirmLabel="Close"
      cancelLabel=""
      tone="constructive"
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
}
