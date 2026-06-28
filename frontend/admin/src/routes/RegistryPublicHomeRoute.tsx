/**
 * RegistryPublicHome — H10 A1 admin route (live registry data).
 *
 * Reads the registry's plugin list via the bridge + partitions it
 * into "Recently updated" (sort=recent_update) and "Recently added"
 * (sort=recently_added). Extension-point tile counts come from a
 * group-by on the result; the registry doesn't yet ship a dedicated
 * extension-points endpoint.
 *
 * Mounted at /registry.
 */

import {
  type ExtensionPointTile,
  type RecentlyAddedItem,
  type RecentlyUpdatedItem,
  RegistryPublicHomeSurface,
  type TierKey,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { apiMethods } from "../data/api.js";

function tierOf(tier: string): TierKey {
  if (tier === "official" || tier === "community" || tier === "unverified") {
    return tier;
  }
  return "unverified";
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Math.max(0, Date.now() - then);
  const days = Math.floor(delta / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function RegistryPublicHomeRoute() {
  useTopbar(() => ({
    title: "Plugin registry",
    subtitle: "Browse · audit · contribute",
  }));

  const recentUpdate = useQuery({
    queryKey: ["registry-plugins", "recent_update"],
    queryFn: async () =>
      apiMethods.listRegistryPlugins({ sort: "recent_update" }),
    staleTime: 60_000,
  });

  const recentlyAdded = useQuery({
    queryKey: ["registry-plugins", "recently_added"],
    queryFn: async () =>
      apiMethods.listRegistryPlugins({ sort: "recently_added" }),
    staleTime: 60_000,
  });

  const recentlyUpdatedRows = useMemo<RecentlyUpdatedItem[]>(() => {
    const rows = recentUpdate.data?.plugins ?? [];
    return rows.slice(0, 5).map<RecentlyUpdatedItem>((p) => ({
      name: p.name,
      version: "—",  // registry's card view doesn't surface version
      when: timeAgo(p.updated_at),
      href: p.homepage ?? undefined,
    }));
  }, [recentUpdate.data]);

  const recentlyAddedRows = useMemo<RecentlyAddedItem[]>(() => {
    const rows = recentlyAdded.data?.plugins ?? [];
    return rows.slice(0, 5).map<RecentlyAddedItem>((p) => ({
      name: p.name,
      tier: tierOf(p.tier),
      when: timeAgo(p.updated_at),
      href: p.homepage ?? undefined,
    }));
  }, [recentlyAdded.data]);

  const extensionPoints = useMemo<ExtensionPointTile[]>(() => {
    const rows = recentUpdate.data?.plugins ?? [];
    const total = rows.filter((p) => !p.tombstoned).length;
    const byTier = new Map<TierKey, number>();
    for (const p of rows) {
      if (p.tombstoned) continue;
      const t = tierOf(p.tier);
      byTier.set(t, (byTier.get(t) ?? 0) + 1);
    }
    // Three tiles per tier — sensible v1 stand-in until the registry
    // ships dedicated extension-point counts.
    return [
      {
        name: "All plugins",
        count: String(total),
        desc: "Everything currently published — official, community, unverified.",
      },
      {
        name: "Official",
        count: String(byTier.get("official") ?? 0),
        desc: "Promoted by the registry maintainers after review.",
      },
      {
        name: "Community",
        count: String(byTier.get("community") ?? 0),
        desc: "Accepted by a maintainer; not yet promoted to official.",
      },
    ];
  }, [recentUpdate.data]);

  return (
    <RegistryPublicHomeSurface
      extensionPoints={extensionPoints}
      recentlyUpdated={recentlyUpdatedRows}
      recentlyAdded={recentlyAddedRows}
      submitHref="/registry/submit"
    />
  );
}
