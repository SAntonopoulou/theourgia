/**
 * PluginAuthorProfile — admin route at ``/plugins/authors/:did``.
 *
 * Live-wired: GET /api/v1/registry/authors/{did} for the author
 * profile, and GET /api/v1/registry/plugins (filtered client-side)
 * for the list of plugins this author has published.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  type AuthorPluginCard,
  PluginAuthorProfileSurface,
  useTopbar,
} from "@theourgia/shared";

import { apiMethods } from "../data/api.js";
import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

function initialFrom(name: string, did: string): string {
  const first = name?.trim()?.[0] ?? did.split(":").pop()?.[0] ?? "A";
  return first.toUpperCase();
}

export function PluginAuthorProfile() {
  const navigate = useNavigate();
  const { did } = useParams<{ did: string }>();

  const authorQuery = useQuery({
    queryKey: ["registry-author", did],
    queryFn: async () =>
      did
        ? apiMethods.getRegistryAuthor(did)
        : Promise.reject(new Error("No author DID")),
    enabled: !!did,
  });

  const pluginsQuery = useQuery({
    queryKey: ["registry-plugins"],
    queryFn: async () => apiMethods.listRegistryPlugins(),
    staleTime: 60_000,
  });

  const authorPlugins = useMemo<AuthorPluginCard[]>(() => {
    const rows = pluginsQuery.data?.plugins ?? [];
    return rows
      .filter((p) => p.author_did === did)
      .map((p) => ({
        id: p.id,
        kind: "widget" as never,
        name: p.name,
        version: "—",
        tier: p.tier as never,
        description: p.description,
      }));
  }, [pluginsQuery.data, did]);

  useTopbar(
    () => ({ title: authorQuery.data?.display_name ?? "Author" }),
    [authorQuery.data?.display_name],
  );

  if (authorQuery.isPending || pluginsQuery.isPending) {
    return <SurfaceSkeleton rowCount={3} />;
  }
  if (authorQuery.isError) {
    return (
      <SurfaceError
        title="Couldn't load author"
        message={authorQuery.error instanceof Error ? authorQuery.error.message : "Unknown"}
        onRetry={() => void authorQuery.refetch()}
      />
    );
  }

  const author = authorQuery.data;
  const displayName = author?.display_name ?? "(unknown author)";

  return (
    <PluginAuthorProfileSurface
      displayName={displayName}
      monogram={initialFrom(displayName, did ?? "")}
      did={did ?? ""}
      about={<p style={{ margin: 0 }}>{author?.display_name ? `Plugins by ${author.display_name}.` : "Author profile."}</p>}
      homepage={author?.homepage ?? undefined}
      pluginCount={author?.plugin_count ?? authorPlugins.length}
      firstPublishedLabel="—"
      lastActivityLabel="—"
      licenseLabel="—"
      plugins={authorPlugins}
      onPluginClick={(id) => navigate(`/plugins/registry/${id}`)}
    />
  );
}
