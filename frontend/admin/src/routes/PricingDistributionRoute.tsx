/**
 * Pricing & Distribution — admin route at
 * ``/publications/:id/pricing`` (and ``/pricing-distribution`` when
 * arrived at without a specific publication — walks up to the most
 * recent draft).
 *
 * Live-wired:
 *   · GET  /api/v1/publications/{id}                → seed pricing.
 *   · PATCH /api/v1/publications/{id}               → pricing_model /
 *     amount / currency / watermark_enabled.
 *   · GET  /api/v1/stripe-connect/account           → onboarding state.
 *   · POST /api/v1/stripe-connect/account           → connect link.
 *   · DELETE /api/v1/stripe-connect/account         → disconnect.
 *
 * Refund policy is UI-only (backend has no column for it yet — the
 * Stripe portal handles per-charge refunds). Custom refund text is
 * stored client-side until a column lands.
 */

import {
  type PricingDistributionRecord,
  type PricingModel,
  type RefundPolicy,
  type StripeConnectState,
  PricingDistributionSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface WirePublication {
  id: string;
  title: string;
  pricing_model: string;
  one_time_amount_cents: number | null;
  currency: string;
  watermark_enabled: boolean;
}

interface WireStripeAccount {
  stripe_account_id: string | null;
  onboarding_status: string;
  payouts_enabled: boolean;
  charges_enabled: boolean;
}

const WIRE_TO_SURFACE_MODEL: Record<string, PricingModel> = {
  free: "free",
  one_time: "one-time",
  subscribe: "subscribe",
};

const SURFACE_TO_WIRE_MODEL: Record<PricingModel, string> = {
  free: "free",
  "one-time": "one_time",
  "pay-what-you-wish": "one_time", // backend has no PWYW yet — save as one-time
  subscribe: "subscribe",
};

function wireStripeState(
  row: WireStripeAccount | null,
  userEmail: string | null,
): PricingDistributionRecord["stripe_connect"] {
  if (row === null || row.stripe_account_id === null) {
    return { state: "none" };
  }
  const state: StripeConnectState =
    row.onboarding_status === "active"
      ? "active"
      : row.onboarding_status === "disconnected"
        ? "none"
        : "pending";
  return { state, account_email: userEmail };
}

export function PricingDistributionRoute() {
  const { id: paramId } = useParams<{ id: string }>();

  useTopbar(
    () => ({
      title: "Pricing & Distribution",
      subtitle:
        "Price model · Stripe Connect · refund policy · watermarking",
    }),
    [],
  );

  const [publicationId, setPublicationId] = useState<string | null>(paramId ?? null);
  const [record, setRecord] = useState<PricingDistributionRecord | null>(null);

  // Local-only bits until backend columns land.
  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>("standard-14");
  const [refundText, setRefundText] = useState<string | null>(null);

  const loadPublication = useCallback(
    async (id: string, stripe: PricingDistributionRecord["stripe_connect"]) => {
      try {
        const row = await apiClient.request<WirePublication>(
          `/api/v1/publications/${encodeURIComponent(id)}`,
        );
        setRecord({
          model: WIRE_TO_SURFACE_MODEL[row.pricing_model] ?? "free",
          currency: (row.currency ?? "usd").toUpperCase(),
          amount_cents: row.one_time_amount_cents ?? 0,
          refund_policy: refundPolicy,
          refund_policy_text: refundText,
          watermark_buyer_email: row.watermark_enabled,
          stripe_connect: stripe,
        });
      } catch (e) {
        Toast.push({
          tone: "error",
          title: "Couldn't load publication",
          body: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [refundPolicy, refundText],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load Stripe state + user email in parallel.
      const [stripeRow, session] = await Promise.all([
        apiClient
          .request<WireStripeAccount>("/api/v1/stripe-connect/account")
          .catch(() => null),
        apiClient
          .request<{ user?: { email?: string | null } }>("/api/v1/auth/session")
          .catch(() => null),
      ]);
      if (cancelled) return;

      const stripe = wireStripeState(stripeRow, session?.user?.email ?? null);

      let idToUse = paramId ?? null;
      if (idToUse === null) {
        // No publication in URL — pick the most-recent draft, if any.
        try {
          const pubs = await apiClient.request<WirePublication[]>(
            "/api/v1/publications?limit=1",
          );
          idToUse = pubs[0]?.id ?? null;
        } catch {
          idToUse = null;
        }
      }

      if (idToUse === null) {
        // No publication yet → surface stripe state only, no pricing row.
        setRecord({
          model: "free",
          currency: "USD",
          amount_cents: 0,
          refund_policy: refundPolicy,
          refund_policy_text: refundText,
          watermark_buyer_email: false,
          stripe_connect: stripe,
        });
        return;
      }
      setPublicationId(idToUse);
      await loadPublication(idToUse, stripe);
    })();
    return () => {
      cancelled = true;
    };
  }, [paramId, loadPublication, refundPolicy, refundText]);

  const handleChange = useCallback(
    (patch: Partial<PricingDistributionRecord>) => {
      setRecord((prev) => (prev ? { ...prev, ...patch } : prev));

      // Refund policy stays client-side.
      if (patch.refund_policy !== undefined) {
        setRefundPolicy(patch.refund_policy);
      }
      if (patch.refund_policy_text !== undefined) {
        setRefundText(patch.refund_policy_text ?? null);
      }

      if (!publicationId) return;
      const wirePatch: Record<string, unknown> = {};
      if (patch.model !== undefined) {
        wirePatch.pricing_model = SURFACE_TO_WIRE_MODEL[patch.model];
      }
      if (patch.amount_cents !== undefined) {
        wirePatch.one_time_amount_cents = patch.amount_cents;
      }
      if (patch.currency !== undefined) {
        wirePatch.currency = patch.currency.toLowerCase();
      }
      if (patch.watermark_buyer_email !== undefined) {
        wirePatch.watermark_enabled = patch.watermark_buyer_email;
      }
      if (Object.keys(wirePatch).length === 0) return;

      apiClient
        .request<WirePublication>(
          `/api/v1/publications/${encodeURIComponent(publicationId)}`,
          { method: "PATCH", json: wirePatch },
        )
        .catch((e) => {
          Toast.push({
            tone: "error",
            title: "Couldn't save",
            body: e instanceof Error ? e.message : String(e),
          });
        });
    },
    [publicationId],
  );

  const handleConnectStripe = useCallback(async () => {
    try {
      const link = await apiClient.request<{ url: string; expires_at: number }>(
        "/api/v1/stripe-connect/account",
        { method: "POST", json: {} },
      );
      // Open the onboarding URL — the surface's own copy says this
      // hands off to Stripe in a new tab.
      window.open(link.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't start Stripe onboarding",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  const handleDisconnectStripe = useCallback(async () => {
    try {
      await apiClient.request<void>("/api/v1/stripe-connect/account", {
        method: "DELETE",
      });
      setRecord((prev) =>
        prev ? { ...prev, stripe_connect: { state: "none" } } : prev,
      );
      Toast.push({
        tone: "success",
        title: "Stripe disconnected",
        body: "New checkouts will be paused until reconnected.",
      });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't disconnect",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  if (!record) {
    return (
      <div
        style={{
          padding: "40px 24px",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        Loading pricing…
      </div>
    );
  }

  return (
    <PricingDistributionSurface
      publication={record}
      onChange={handleChange}
      onConnectStripe={() => void handleConnectStripe()}
      onDisconnectStripe={() => void handleDisconnectStripe()}
    />
  );
}
