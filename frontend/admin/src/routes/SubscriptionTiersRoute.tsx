/**
 * Subscription Tiers — admin route.
 *
 * Live-wired against Phase 10 subscription-tiers backend (B126):
 *   · GET    /api/v1/subscription-tiers         → list.
 *   · POST   /api/v1/subscription-tiers         → create.
 *   · PATCH  /api/v1/subscription-tiers/{id}    → name / description / enabled
 *                                                  (amount is IMMUTABLE — Stripe
 *                                                  price ids don't change).
 *
 * Surface-vs-wire mapping:
 *   surface.monthly_cents  ↔ wire.monthly_amount_cents.
 *   surface.annual_cents   → derived as monthly × 10 (annual isn't backed
 *                            yet; the surface just needs a display value).
 *   surface.included_labels → UI-only for now (no wire column).
 *   surface.display_order  → tracked client-side by create-order.
 *
 * Pause-new-subscriptions is currently a per-tier boolean (enabled=false
 * blocks new subs). The global "pause all" toggle applies to every tier
 * on toggle until a global switch lands.
 */

import {
  type SubscriptionTier as SurfaceTier,
  SubscriptionTiersSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiClient } from "../data/api.js";

interface WireTier {
  id: string;
  name: string;
  description: string | null;
  monthly_amount_cents: number;
  currency: string;
  enabled: boolean;
  is_primary: boolean;
  stripe_price_id: string | null;
}

function wireToSurface(w: WireTier, index: number): SurfaceTier {
  return {
    id: w.id,
    name: w.name,
    monthly_cents: w.monthly_amount_cents,
    annual_cents: w.monthly_amount_cents * 10,
    description: w.description ?? "",
    included_labels: [],
    enabled: w.enabled,
    display_order: index + 1,
  };
}

export function SubscriptionTiersRoute() {
  useTopbar(
    () => ({
      title: "Subscription Tiers",
      subtitle:
        "Recurring support — name them in your own voice, no leaderboards",
    }),
    [],
  );

  const [tiers, setTiers] = useState<SurfaceTier[]>([]);
  const [currency, setCurrency] = useState<string>("USD");
  const [paused, setPaused] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await apiClient.request<WireTier[]>("/api/v1/subscription-tiers");
      setTiers(rows.map(wireToSurface));
      if (rows[0]?.currency) {
        setCurrency(rows[0].currency.toUpperCase());
      }
      // Derive pause state: all tiers disabled → paused.
      setPaused(rows.length > 0 && rows.every((r) => !r.enabled));
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't load tiers",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTierChange = useCallback(
    async (id: string, patch: Partial<SurfaceTier>) => {
      // Optimistic UI.
      setTiers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      const wirePatch: Record<string, unknown> = {};
      if (patch.name !== undefined) wirePatch.name = patch.name;
      if (patch.description !== undefined) wirePatch.description = patch.description;
      if (patch.enabled !== undefined) wirePatch.enabled = patch.enabled;
      if (Object.keys(wirePatch).length === 0) return;
      try {
        await apiClient.request<WireTier>(
          `/api/v1/subscription-tiers/${encodeURIComponent(id)}`,
          { method: "PATCH", json: wirePatch },
        );
      } catch (e) {
        Toast.push({
          tone: "error",
          title: "Couldn't save tier",
          body: e instanceof Error ? e.message : String(e),
        });
        void load();
      }
    },
    [load],
  );

  const handleAddTier = useCallback(async () => {
    try {
      const row = await apiClient.request<WireTier>(
        "/api/v1/subscription-tiers",
        {
          method: "POST",
          json: {
            name: "New tier",
            description:
              "Describe what this tier offers — in your own voice.",
            monthly_amount_cents: 1000,
            currency: currency.toLowerCase(),
          },
        },
      );
      setTiers((prev) => [...prev, wireToSurface(row, prev.length)]);
      Toast.push({
        tone: "success",
        title: "Tier created",
        body: "Set the price and description, then enable to accept subscribers.",
      });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't create tier",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [currency]);

  const handleTogglePaused = useCallback(async () => {
    const next = !paused;
    setPaused(next);
    // Flip every tier's `enabled` flag to mirror global paused state.
    const patches = tiers.map((t) =>
      apiClient
        .request<WireTier>(`/api/v1/subscription-tiers/${encodeURIComponent(t.id)}`, {
          method: "PATCH",
          json: { enabled: !next },
        })
        .catch((e) => {
          Toast.push({
            tone: "error",
            title: `Couldn't ${next ? "pause" : "resume"} “${t.name}”`,
            body: e instanceof Error ? e.message : String(e),
          });
        }),
    );
    await Promise.all(patches);
    await load();
  }, [paused, tiers, load]);

  return (
    <SubscriptionTiersSurface
      currency={currency}
      tiers={tiers}
      paused_new_subscriptions={paused}
      onTierChange={handleTierChange}
      onAddTier={handleAddTier}
      onTogglePaused={handleTogglePaused}
    />
  );
}
