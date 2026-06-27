/**
 * HubDiscovery — admin route at ``/networks/discover``.
 *
 * Wired to ``GET /api/v1/hubs`` per the admin API-wiring convention.
 * The backend returns hubs the user can see (member-of OR
 * non-private); discovery filters to non-private here. The "request
 * to join" CTA navigates to the hub detail for now — the dedicated
 * invitations endpoint lands with the federation transport (Phase 12.5).
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  type HubDiscoveryCard,
  HubDiscoverySurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { type Hub, useHubs } from "../lib/hubs.js";

const POLICY_TO_CARD: Record<
  Hub["membership_policy"],
  HubDiscoveryCard["policy"]
> = {
  open: "public",
  request_to_join: "open-with-approval",
  invite_only: "private",
  private: "private",
};

function bannerFor(seed: string): string {
  // Stable per-slug accent so the chrome is calm but distinguishable.
  const hash = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  const palette = [
    "linear-gradient(120deg,var(--network-soft),var(--bg-sunk))",
    "linear-gradient(120deg,rgba(199,162,76,.16),var(--bg-sunk))",
    "linear-gradient(120deg,rgba(110,142,99,.18),var(--bg-sunk))",
    "linear-gradient(120deg,rgba(169,138,192,.16),var(--bg-sunk))",
  ];
  return palette[hash % palette.length] ?? palette[0]!;
}

function toCard(hub: Hub): HubDiscoveryCard {
  return {
    id: hub.id,
    slug: hub.slug,
    name: hub.name,
    motto: hub.tagline ?? "",
    traditions: hub.public_tradition_tags ?? [],
    policy: POLICY_TO_CARD[hub.membership_policy],
    // Member count is a backend-derived field that's not surfaced
    // yet — rule 9 says quiet stats, so we render "—" until it
    // lands. The surface still renders a count; we pass 0.
    memberCount: 0,
    isMember: false,
    bannerStyle: bannerFor(hub.slug),
  };
}

export function HubDiscovery() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Discover hubs" }));

  const { data, isLoading, error, refetch } = useHubs();

  const cards = useMemo(
    () =>
      data
        ? data
            // Discovery hides truly private hubs; the user only sees
            // what they can act on.
            .filter((h) => h.membership_policy !== "private")
            .map(toCard)
        : [],
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load hubs."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <HubDiscoverySurface
      hubs={cards}
      onRequestJoin={(hubId) => navigate(`/networks/hubs/${hubId}`)}
    />
  );
}
