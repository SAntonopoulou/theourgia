/**
 * RegistryPluginDetail — admin route at ``/plugins/registry/:id``.
 *
 * Live-wired: fetches the plugin from the registry via the
 * /api/v1/registry/plugins list and picks the row with the matching
 * id. Full plugin-detail JSON on the registry side ships a per-slug
 * endpoint in a follow-up.
 *
 * Install CTA (v1-032): wired to POST /api/v1/plugins/install-from-
 * registry — the backend resolves the newest accepted release,
 * verifies sha256 + the author's Ed25519 signature, and unpacks.
 * Failures (registry unconfigured → 503, unsigned/tampered → 400,
 * tombstoned → 410 with the author's reason) surface verbatim in the
 * banner above the surface — never a silent no-op.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { RegistryPluginDetailSurface, useTopbar } from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { useInstallFromRegistry } from "../lib/plugins.js";

export function RegistryPluginDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const install = useInstallFromRegistry();

  const query = useQuery({
    queryKey: ["registry-plugins"],
    queryFn: async () => apiMethods.listRegistryPlugins(),
    staleTime: 60_000,
  });

  const plugin = useMemo(() => query.data?.plugins?.find((p) => p.id === id), [query.data, id]);

  useTopbar(() => ({ title: plugin?.name ?? "Plugin" }), [plugin?.name]);

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
    <>
      {install.error ? (
        <SurfaceError
          title="The install didn't go through."
          message={install.error instanceof Error ? install.error.message : "Unknown error"}
          onRetry={() => install.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <RegistryPluginDetailSurface
        name={plugin.name}
        version={plugin.latest_version ?? "—"}
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
          if (install.isPending) return;
          install.mutate({ slug: plugin.name }, { onSuccess: () => navigate("/plugins") });
        }}
        onViewAuthor={() => navigate(`/plugins/authors/${encodeURIComponent(plugin.author_did)}`)}
      />
    </>
  );
}
