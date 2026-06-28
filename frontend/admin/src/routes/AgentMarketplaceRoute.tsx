/**
 * AgentMarketplace — H10 C2 admin route (live registry browse).
 *
 * Reads the registry's public plugin list via the bridge
 * (/api/v1/registry/plugins) — the registry's *real* listing endpoint
 * runs at plugins.theourgia.com but we proxy through the vault so the
 * admin SPA sees a single origin.
 *
 * Note: the registry distinguishes plugins (bundles, integrations,
 * etc.) from "agents" (Phase 16). For v1 we surface every plugin as
 * a marketplace card; once the registry adds an `agent` filter the
 * route will pass it.
 *
 * Mounted at /agents-marketplace.
 */

import {
  type AgentMarketKind,
  type AgentTier,
  AgentMarketplaceSurface,
  type CapabilityFilter,
  type MarketAgentCard,
  type MarketSortOption,
  type SourceFilter,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

function tierToAgentTier(tier: string): AgentTier {
  if (tier === "official" || tier === "community" || tier === "unverified") {
    return tier;
  }
  return "unverified";
}

export function AgentMarketplaceRoute() {
  const navigate = useNavigate();
  const [source, setSource] = useState<SourceFilter>("all");
  const [capability, setCapability] = useState<CapabilityFilter>("all");
  const [sort, setSort] = useState<MarketSortOption>("recently_added");

  useTopbar(() => ({
    title: "Marketplace",
    subtitle: "Browse agents · your keys, your instance",
  }));

  const query = useQuery({
    queryKey: ["agent-marketplace", sort],
    queryFn: async () =>
      apiMethods.listRegistryPlugins({
        sort: sort === "alpha" ? "alpha" : "recently_added",
      }),
    staleTime: 60_000,
  });

  const cards = useMemo<MarketAgentCard[]>(() => {
    const plugins = query.data?.plugins ?? [];
    return plugins
      .filter((p) => !p.tombstoned)
      .filter((p) => {
        if (source === "all") return true;
        return tierToAgentTier(p.tier) === source;
      })
      .map<MarketAgentCard>((p) => ({
        id: p.id,
        name: p.name,
        kind: "study" as AgentMarketKind,  // placeholder; registry needs `kind` field
        tier: tierToAgentTier(p.tier),
        description: p.description,
        capabilityLabel: "—",  // registry list doesn't carry capabilities per card
      }));
  }, [query.data, source]);

  return (
    <AgentMarketplaceSurface
      cards={cards}
      source={source}
      capability={capability}
      sort={sort}
      onSourceChange={setSource}
      onCapabilityChange={setCapability}
      onSortChange={setSort}
      onOpen={(id) => navigate(`/agents-marketplace/${encodeURIComponent(id)}`)}
    />
  );
}
