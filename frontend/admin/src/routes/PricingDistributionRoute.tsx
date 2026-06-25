/**
 * Pricing & Distribution — admin route (H07 §S3 surface 7).
 *
 * Phase 10 backend is unbuilt by design (H07 onboarding). The
 * route holds local state for now. Connect/Disconnect Stripe
 * callbacks Toast pending the
 * POST /api/v1/stripe/connect/onboarding-link wiring.
 */

import {
  type PricingDistributionRecord,
  PricingDistributionSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";

function makeFixture(): PricingDistributionRecord {
  return {
    model: "one-time",
    currency: "USD",
    amount_cents: 1800,
    refund_policy: "standard-14",
    watermark_buyer_email: false,
    stripe_connect: {
      state: "active",
      account_email: "soror.alpha@protonmail.com",
    },
  };
}

export function PricingDistributionRoute() {
  useTopbar(
    () => ({
      title: "Pricing & Distribution",
      subtitle:
        "Price model · Stripe Connect · refund policy · watermarking",
    }),
    [],
  );

  const [publication, setPublication] = useState<PricingDistributionRecord>(
    () => makeFixture(),
  );

  const handleChange = useCallback(
    (patch: Partial<PricingDistributionRecord>) => {
      setPublication((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleConnectStripe = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Stripe Connect onboarding",
      body: "Once Phase 10 backend ships, this opens the hosted Stripe onboarding flow in a new tab.",
    });
  }, []);

  const handleDisconnectStripe = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Disconnect Stripe",
      body: "Disconnect flow opens in Stripe's Customer Portal — never inline.",
    });
  }, []);

  return (
    <PricingDistributionSurface
      publication={publication}
      onChange={handleChange}
      onConnectStripe={handleConnectStripe}
      onDisconnectStripe={handleDisconnectStripe}
    />
  );
}
