/**
 * HubPublicFace — admin-side preview route at ``/hub/:slug``.
 *
 * Wired to ``GET /api/v1/hubs`` (filtered by slug client-side) per
 * the admin API-wiring convention. The featured-items pane stays at
 * a placeholder until the backend exposes a /hubs/:id/featured
 * endpoint — at which point this route picks it up via a per-hub
 * query.
 */

import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  type HubFeaturedItem,
  HubPublicFaceSurface,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { type Hub, useHubs } from "../lib/hubs.js";

const POLICY_TO_SURFACE: Record<
  Hub["membership_policy"],
  React.ComponentProps<typeof HubPublicFaceSurface>["policy"]
> = {
  open: "public",
  request_to_join: "open-with-approval",
  invite_only: "private",
  private: "private",
};

function monogramOf(name: string): string {
  return (name[0] ?? "·").toUpperCase();
}

const FEATURED_PLACEHOLDER: HubFeaturedItem[] = [];

export function HubPublicFace() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error, refetch } = useHubs();

  const hub = useMemo(
    () => (data && slug ? data.find((h) => h.slug === slug) : undefined),
    [data, slug],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={3} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load this hub."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (!hub) {
    return (
      <SurfaceError
        title="Hub not found."
        message={`No hub with slug ${slug ?? ""} is visible to you.`}
      />
    );
  }

  return (
    <HubPublicFaceSurface
      hubName={hub.name}
      motto={hub.tagline ?? ""}
      traditions={hub.public_tradition_tags ?? []}
      establishedAt={new Date(hub.created_at).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })}
      monogram={monogramOf(hub.name)}
      about={hub.description || ""}
      featured={FEATURED_PLACEHOLDER}
      policy={POLICY_TO_SURFACE[hub.membership_policy]}
      viewer="anonymous"
    />
  );
}
