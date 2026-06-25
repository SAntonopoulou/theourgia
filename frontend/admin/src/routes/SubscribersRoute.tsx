/**
 * Subscribers — admin route (H07 §S3 surface 10).
 *
 * Phase 10 backend is unbuilt by design; the route holds fixture
 * data. Stripe customer + refund actions Toast pending the
 * stripe-portal hand-off.
 */

import {
  type SubscriberRow,
  SubscribersSurface,
  type SubscribersStats,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

const STATS: SubscribersStats = {
  active_count: 38,
  monthly_recurring_revenue_cents: 21400,
  lifetime_revenue_cents: 294000,
  churn_30d_percent: 2.1,
};

const ROWS: SubscriberRow[] = [
  {
    id: "demo-sub-1",
    identity_label: "Frater A.O.",
    tier_label: "Patrons",
    active_since: "14 Jan 2026",
    status: "active",
    is_test: false,
  },
  {
    id: "demo-sub-2",
    identity_label: "soror.nyx@…",
    tier_label: "Witnesses",
    active_since: "02 Feb 2026",
    status: "active",
    is_test: false,
  },
  {
    id: "demo-sub-3",
    identity_label: "Diotima",
    tier_label: "Stewards",
    active_since: "19 Nov 2025",
    status: "active",
    is_test: false,
  },
  {
    id: "demo-sub-4",
    identity_label: "k.hermes@…",
    tier_label: "Witnesses",
    active_since: "30 Mar 2026",
    status: "paused",
    is_test: false,
  },
  {
    id: "demo-sub-5",
    identity_label: "thalassa@…",
    tier_label: "Patrons",
    active_since: "11 Dec 2025",
    status: "failed",
    is_test: false,
  },
  {
    id: "demo-sub-6",
    identity_label: "Frater V.",
    tier_label: "Witnesses",
    active_since: "08 Oct 2025",
    status: "cancelled",
    is_test: false,
  },
];

export function SubscribersRoute() {
  useTopbar(
    () => ({
      title: "Subscribers",
      subtitle: "Who supports the practice — sober, observational",
    }),
    [],
  );

  const handleRowAction = useCallback(
    (id: string, action: "view-stripe" | "refund" | "toggle-test") => {
      const label =
        action === "view-stripe"
          ? "Open in Stripe"
          : action === "refund"
            ? "Refund via Stripe portal"
            : "Toggle test flag";
      Toast.push({
        tone: "info",
        title: label,
        body: `Subscriber ${id} — wires to the Stripe portal once Phase 10 backend ships.`,
      });
    },
    [],
  );

  return (
    <SubscribersSurface
      stats={STATS}
      subscribers={ROWS}
      currency="USD"
      onRowAction={handleRowAction}
    />
  );
}
