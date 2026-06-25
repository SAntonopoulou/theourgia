/**
 * Subscription Tiers — admin route (H07 §S3 surface 9).
 *
 * Phase 10 backend is unbuilt by design; the route holds tier
 * state in memory for now. When Phase 10 ships, this binds to the
 * subscription-tiers REST endpoints + Stripe Connect.
 */

import {
  type SubscriptionTier,
  SubscriptionTiersSurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";

function makeFixtureTiers(): SubscriptionTier[] {
  return [
    {
      id: "t-witnesses",
      name: "Witnesses",
      monthly_cents: 300,
      annual_cents: 3000,
      description:
        "Early access to every essay, and the monthly dark-moon letter.",
      included_labels: ["The Dark Moon Letters", "Monthly essay"],
      enabled: true,
      display_order: 1,
    },
    {
      id: "t-patrons",
      name: "Patrons",
      monthly_cents: 800,
      annual_cents: 8000,
      description:
        "Everything in Witnesses, plus the working-notes appendices and quarterly voice recordings.",
      included_labels: ["All Witnesses content", "Working-notes appendices"],
      enabled: true,
      display_order: 2,
    },
    {
      id: "t-stewards",
      name: "Stewards",
      monthly_cents: 2000,
      annual_cents: 20000,
      description:
        "All published work, plus a twice-yearly correspondence on your own practice.",
      included_labels: ["All content", "Twice-yearly correspondence"],
      enabled: false,
      display_order: 3,
    },
  ];
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

  const [tiers, setTiers] = useState<SubscriptionTier[]>(makeFixtureTiers);
  const [paused, setPaused] = useState(false);

  const handleTierChange = useCallback(
    (id: string, patch: Partial<SubscriptionTier>) => {
      setTiers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    [],
  );

  const handleAddTier = useCallback(() => {
    setTiers((prev) => [
      ...prev,
      {
        id: `t-${Date.now().toString(36)}`,
        name: "New tier",
        monthly_cents: 1000,
        annual_cents: 10000,
        description: "Describe what this tier offers — in your own voice.",
        included_labels: [],
        enabled: false,
        display_order:
          prev.reduce((acc, t) => Math.max(acc, t.display_order), 0) + 1,
      },
    ]);
  }, []);

  const handleTogglePaused = useCallback(() => setPaused((v) => !v), []);

  return (
    <SubscriptionTiersSurface
      currency="USD"
      tiers={tiers}
      paused_new_subscriptions={paused}
      onTierChange={handleTierChange}
      onAddTier={handleAddTier}
      onTogglePaused={handleTogglePaused}
    />
  );
}
