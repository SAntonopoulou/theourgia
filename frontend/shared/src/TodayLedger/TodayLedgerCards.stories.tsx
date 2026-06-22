/**
 * TodayLedger composer stories — full payload, empty payload, sealed-only.
 */
import type { Meta, StoryObj } from "@storybook/react";

import type { TodayLedger } from "../api/types.js";
import { TodayLedgerCards } from "./TodayLedgerCards.js";

const meta = {
  title: "TodayLedger",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      background: "var(--bg)",
      maxWidth: 360,
    }}
  >
    {children}
  </div>
);

const fmt = (iso: string): string => {
  // Stable demo formatting — production wires its own
  // locale + tz-aware relative formatter.
  const d = new Date(iso);
  const now = Date.parse("2026-06-22T14:00:00Z");
  const delta = d.getTime() - now;
  const hours = Math.round(delta / 3_600_000);
  if (hours === 0) return "now";
  if (hours > 0 && hours < 24) return `in ${hours}h`;
  if (hours < 0 && hours > -24) return `${-hours}h ago`;
  const days = Math.round(hours / 24);
  return days > 0 ? `in ${days}d` : `${-days}d ago`;
};

const fullLedger: TodayLedger = {
  active_practices: {
    practices: [
      {
        recurring_offering_id: "ro1",
        entity_id: "e-hekate",
        label: "Crossroads candle for Hekate",
        cadence: "Every dark moon",
        next_due_at: "2026-06-22T18:00:00Z",
        hours_until_due: 4,
      },
      {
        recurring_offering_id: "ro2",
        entity_id: "e-brigid",
        label: "Imbolc milk-pour for Brigid",
        cadence: "Weekly · Sundays",
        next_due_at: "2026-06-23T08:00:00Z",
        hours_until_due: 18,
      },
    ],
    total_due_in_24h: 2,
  },
  obligations: {
    contract_obligations: [
      {
        contract_id: "c1",
        contract_title: "Beltane Pact with Brigid, 2026",
        side: "ours",
        obligation_id: "ob1",
        description: "Pour milk at sunset before the equinox.",
        due_at: "2026-06-22T20:00:00Z",
        status: "open",
      },
    ],
    oath_checkpoints: [
      {
        oath_id: "o1",
        oath_kind: "discipline",
        recipient: null,
        due_at: "2026-06-23T08:00:00Z",
        sealed: false,
        prompt: "Three pages of Liber Resh memorisation due.",
      },
    ],
    sealed_checkpoint_count: 2,
  },
  servitor_feeding: {
    feedings_due: [
      {
        servitor_id: "s1",
        name: "The Threshold Guardian",
        kind: "Servitor",
        feeding_cadence: "Every 7 days",
        last_fed_at: "2026-06-16T00:00:00Z",
      },
    ],
  },
  attestation_activity: {
    activity: [
      {
        attestation_id: "a1",
        description:
          "Initiation as Minerval in the Lyceum tradition.",
        signer_label: "Frater Lykourgos",
        role: "witness",
        signed_at: "2026-06-20T12:00:00Z",
      },
    ],
  },
  generated_at: "2026-06-22T14:00:00Z",
};

const emptyLedger: TodayLedger = {
  active_practices: { practices: [], total_due_in_24h: 0 },
  obligations: {
    contract_obligations: [],
    oath_checkpoints: [],
    sealed_checkpoint_count: 0,
  },
  servitor_feeding: { feedings_due: [] },
  attestation_activity: { activity: [] },
  generated_at: "2026-06-22T14:00:00Z",
};

const sealedOnlyLedger: TodayLedger = {
  ...emptyLedger,
  obligations: {
    contract_obligations: [],
    oath_checkpoints: [],
    sealed_checkpoint_count: 3,
  },
};

export const Full: Story = {
  name: "Full ledger · four populated cards",
  render: () => (
    <Frame>
      <TodayLedgerCards ledger={fullLedger} formatRelative={fmt} />
    </Frame>
  ),
};

export const Empty: Story = {
  name: "Empty ledger · all cards calm",
  render: () => (
    <Frame>
      <TodayLedgerCards ledger={emptyLedger} formatRelative={fmt} />
    </Frame>
  ),
};

export const SealedOnly: Story = {
  name: "Sealed-only obligations · count callout, zero plaintext",
  render: () => (
    <Frame>
      <TodayLedgerCards ledger={sealedOnlyLedger} formatRelative={fmt} />
    </Frame>
  ),
};
