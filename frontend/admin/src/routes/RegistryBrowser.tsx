/**
 * RegistryBrowser — admin route at ``/plugins/registry``.
 *
 * Live-wired against GET /api/v1/registry/plugins. Wire→surface
 * mapper fills the surface's kind/version/rank fields with what
 * the registry currently exposes (partial — the registry doesn't
 * yet return version metadata; those fields render "—").
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  type RegistryPluginCard as SurfaceCard,
  RegistryBrowserSurface,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function RegistryBrowser() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Registry" }));

  const query = useQuery({
    queryKey: ["registry-plugins"],
    queryFn: async () => apiMethods.listRegistryPlugins(),
    staleTime: 60_000,
  });

  const cards = useMemo<SurfaceCard[]>(() => {
    const rows = query.data?.plugins ?? [];
    return rows.map<SurfaceCard>((p, i) => ({
      id: p.id,
      kind: "widget" as never,
      name: p.name,
      version: "—",
      tier: p.tier as never,
      author: p.author_did,
      description: p.description,
      updatedRank: i + 1,
      addedRank: i + 1,
    }));
  }, [query.data]);

  if (query.isPending) return <SurfaceSkeleton rowCount={4} />;
  if (query.isError) {
    return (
      <SurfaceError
        title="Couldn't load the registry."
        message={query.error instanceof Error ? query.error.message : "Unknown"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <RegistryBrowserSurface
      cards={cards}
      onBreadcrumbHome={() => navigate("/plugins")}
      onView={(id) => navigate(`/plugins/registry/${id}`)}
    />
  );
}
