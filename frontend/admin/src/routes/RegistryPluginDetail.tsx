/**
 * RegistryPluginDetail — admin route at ``/plugins/registry/:id``.
 *
 * Live-wired: fetches the plugin from the registry via the
 * /api/v1/registry/plugins list and picks the row with the matching
 * id. Full plugin-detail JSON on the registry side ships a per-slug
 * endpoint in a follow-up.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  RegistryPluginDetailSurface,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function RegistryPluginDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["registry-plugins"],
    queryFn: async () => apiMethods.listRegistryPlugins(),
    staleTime: 60_000,
  });

  const plugin = useMemo(
    () => query.data?.plugins?.find((p) => p.id === id),
    [query.data, id],
  );

  useTopbar(
    () => ({ title: plugin?.name ?? "Plugin" }),
    [plugin?.name],
  );

  if (query.isPending) return <SurfaceSkeleton rowCount={4} />;
  if (query.isError) {
    return (
      <SurfaceError
        title="Couldn't load the registry."
        message={query.error instanceof Error ? query.error.message : "Unknown error"}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!plugin) {
    return (
      <SurfaceError
        title="Plugin not found"
        message={`No plugin with id ${id ?? "(none)"} in the registry listing.`}
        onRetry={() => navigate("/registry")}
        retryLabel="Back to registry"
      />
    );
  }

  return (
    <RegistryPluginDetailSurface
      name={plugin.name}
      version="—"
      kind="widget"
      tier={plugin.tier as never}
      author={plugin.author_did}
      license="—"
      homepage={plugin.homepage ?? undefined}
      description={<p style={{ margin: 0 }}>{plugin.description}</p>}
      capabilities={[]}
      extensionPoints={[]}
      versions={[]}
      onBreadcrumbHome={() => navigate("/registry")}
      onInstall={() => {
        // Install-from-registry flow requires the local vault to
        // exist + the manifest to be validated; the "capability
        // review" modal is the entry, queued in H10 Cluster A close.
      }}
      onViewAuthor={() =>
        navigate(`/plugins/authors/${encodeURIComponent(plugin.author_did)}`)
      }
    />
  );
}
