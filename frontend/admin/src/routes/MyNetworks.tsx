/**
 * MyNetworks — admin route at ``/networks`` (and ``/hubs`` legacy alias).
 *
 * Wired to ``GET /api/v1/hubs`` (member-of) per the admin API-wiring
 * convention. Invitations endpoint is queued with the federation
 * transport (Phase 12.5) — the invites pane shows empty until then.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  type HubInvitationCard,
  type HubMembershipCard,
  MyNetworksSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { type Hub, useHubs } from "../lib/hubs.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function lastActivityLabel(iso: string, now: number = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  const m = Math.floor(days / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

function initialOf(name: string): string {
  return (name[0] ?? "·").toUpperCase();
}

function toCard(hub: Hub): HubMembershipCard {
  return {
    hubId: hub.id,
    hubName: hub.name,
    tradition: hub.public_tradition_tags?.[0] ?? "—",
    // The membership role is per-user; the /hubs endpoint returns
    // hubs the user can see but doesn't include their role. Until
    // the read shape carries it, render "member" as a calm fallback.
    role: "member",
    lastActivity: lastActivityLabel(hub.updated_at),
    initial: initialOf(hub.name),
  };
}

export function MyNetworks() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "My networks" }));

  const { data, isLoading, error, refetch } = useHubs();

  const hubs = useMemo(
    () => (data ? data.map(toCard) : []),
    [data],
  );

  // Invitations endpoint queued with federation transport.
  const invites: HubInvitationCard[] = [];

  if (isLoading) {
    return <SurfaceSkeleton rowCount={3} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your networks."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <MyNetworksSurface
      hubs={hubs}
      invites={invites}
      onDiscover={() => navigate("/networks/discover")}
      onOpenHub={(hubId) => navigate(`/networks/hubs/${hubId}`)}
      onAcceptInvite={() => {
        // Stubbed until the invitations endpoint ships.
      }}
      onDeclineInvite={() => {
        // Stubbed until the invitations endpoint ships.
      }}
    />
  );
}
