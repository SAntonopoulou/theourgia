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
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { apiMethods } from "../data/api.js";

interface WireSubscriber {
  id: string;
  identity_label?: string;
  email?: string;
  tier_id?: string;
  tier_label?: string;
  status: string;
  created_at?: string;
  is_test?: boolean;
}

function toRow(s: WireSubscriber): SubscriberRow {
  return {
    id: s.id,
    identity_label: s.identity_label ?? s.email ?? "(anonymous)",
    tier_label: s.tier_label ?? "—",
    active_since: s.created_at
      ? new Date(s.created_at).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
    status: s.status as SubscriberRow["status"],
    is_test: s.is_test ?? false,
  };
}


export function SubscribersRoute() {
  useTopbar(
    () => ({
      title: "Subscribers",
      subtitle: "Who supports the practice — sober, observational",
    }),
    [],
  );

  const query = useQuery({
    queryKey: ["subscribers"],
    queryFn: async () =>
      (await apiMethods.listSubscribers()) as unknown as WireSubscriber[],
    staleTime: 30_000,
  });

  const rows = useMemo<SubscriberRow[]>(
    () => (query.data ?? []).map(toRow),
    [query.data],
  );

  // Aggregate stats client-side until the backend exposes an
  // aggregation endpoint.
  const stats = useMemo<SubscribersStats>(() => {
    const active = rows.filter((r) => r.status === "active").length;
    return {
      active_count: active,
      monthly_recurring_revenue_cents: 0,
      lifetime_revenue_cents: 0,
      churn_30d_percent: 0,
    };
  }, [rows]);

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
        body: `Subscriber ${id} — Stripe portal deep-link ships with the Connect-account wire.`,
      });
    },
    [],
  );

  return (
    <SubscribersSurface
      stats={stats}
      subscribers={rows}
      currency="USD"
      onRowAction={handleRowAction}
    />
  );
}
