import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { TodayLedger } from "../api/types.js";
import { TodayLedgerCards } from "./TodayLedgerCards.js";

const baseLedger: TodayLedger = {
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
    ],
    total_due_in_24h: 1,
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
        description: "Initiation as Minerval in the Lyceum tradition.",
        signer_label: "Frater Lykourgos",
        role: "witness",
        signed_at: "2026-06-20T12:00:00Z",
      },
    ],
  },
  generated_at: "2026-06-22T14:00:00Z",
};

const fmt = (iso: string): string => iso;

describe("TodayLedgerCards", () => {
  it("renders all four cards with their headings", () => {
    const { container } = render(
      <TodayLedgerCards ledger={baseLedger} formatRelative={fmt} />,
    );
    expect(container.querySelector('[data-card="active-practices"]')).not.toBeNull();
    expect(container.querySelector('[data-card="obligations"]')).not.toBeNull();
    expect(container.querySelector('[data-card="servitor-feeding"]')).not.toBeNull();
    expect(container.querySelector('[data-card="attestation-activity"]')).not.toBeNull();
  });

  it("renders the active practice label and cadence", () => {
    render(<TodayLedgerCards ledger={baseLedger} formatRelative={fmt} />);
    expect(
      screen.getByText("Crossroads candle for Hekate"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Every dark moon/),
    ).toBeInTheDocument();
  });

  it("renders the contract obligation + oath checkpoint", () => {
    render(<TodayLedgerCards ledger={baseLedger} formatRelative={fmt} />);
    expect(
      screen.getByText("Beltane Pact with Brigid, 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pour milk at sunset before the equinox/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Three pages of Liber Resh memorisation due.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the sealed-callout when sealed_checkpoint_count > 0", () => {
    const { container } = render(
      <TodayLedgerCards ledger={baseLedger} formatRelative={fmt} />,
    );
    const callout = container.querySelector("[data-sealed-callout]");
    expect(callout).not.toBeNull();
    expect(callout?.textContent).toContain(
      "2 sealed checkpoints due",
    );
  });

  it("uses the singular form when sealed_checkpoint_count is 1", () => {
    const ledger = {
      ...baseLedger,
      obligations: {
        ...baseLedger.obligations,
        sealed_checkpoint_count: 1,
      },
    };
    const { container } = render(
      <TodayLedgerCards ledger={ledger} formatRelative={fmt} />,
    );
    const callout = container.querySelector("[data-sealed-callout]");
    expect(callout?.textContent).toContain("1 sealed checkpoint due");
  });

  it("hides the sealed-callout when count is 0", () => {
    const ledger = {
      ...baseLedger,
      obligations: {
        ...baseLedger.obligations,
        sealed_checkpoint_count: 0,
      },
    };
    const { container } = render(
      <TodayLedgerCards ledger={ledger} formatRelative={fmt} />,
    );
    expect(container.querySelector("[data-sealed-callout]")).toBeNull();
  });

  it("renders 'Sealed oath checkpoint' when prompt is null", () => {
    const ledger: TodayLedger = {
      ...baseLedger,
      obligations: {
        ...baseLedger.obligations,
        oath_checkpoints: [
          {
            oath_id: "o2",
            oath_kind: "discipline",
            recipient: null,
            due_at: "2026-06-23T08:00:00Z",
            sealed: true,
            prompt: null,
          },
        ],
      },
    };
    render(<TodayLedgerCards ledger={ledger} formatRelative={fmt} />);
    expect(
      screen.getByText("Sealed oath checkpoint"),
    ).toBeInTheDocument();
  });

  it("shows an empty hint when no recurring offerings are due", () => {
    const ledger: TodayLedger = {
      ...baseLedger,
      active_practices: { practices: [], total_due_in_24h: 0 },
    };
    render(<TodayLedgerCards ledger={ledger} formatRelative={fmt} />);
    expect(
      screen.getByText(/Nothing recurring is due/),
    ).toBeInTheDocument();
  });

  it("shows 'No overdue obligations' when all obligation lists are empty", () => {
    const ledger: TodayLedger = {
      ...baseLedger,
      obligations: {
        contract_obligations: [],
        oath_checkpoints: [],
        sealed_checkpoint_count: 0,
      },
    };
    render(<TodayLedgerCards ledger={ledger} formatRelative={fmt} />);
    expect(
      screen.getByText(/No overdue obligations/),
    ).toBeInTheDocument();
  });

  it("shows empty hints for the feeding + activity cards independently", () => {
    const ledger: TodayLedger = {
      ...baseLedger,
      servitor_feeding: { feedings_due: [] },
      attestation_activity: { activity: [] },
    };
    render(<TodayLedgerCards ledger={ledger} formatRelative={fmt} />);
    expect(
      screen.getByText(/All servitor cadences are current/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No recent signing or revocation activity/),
    ).toBeInTheDocument();
  });

  it("never uses --danger anywhere in the rendered cards", () => {
    const { container } = render(
      <TodayLedgerCards ledger={baseLedger} formatRelative={fmt} />,
    );
    expect(container.innerHTML).not.toContain("--danger");
  });

  it("calls formatRelative for every timestamp on the page", () => {
    const calls: string[] = [];
    const recorder = (iso: string): string => {
      calls.push(iso);
      return "soon";
    };
    render(<TodayLedgerCards ledger={baseLedger} formatRelative={recorder} />);
    // Every iso timestamp in the ledger should have been formatted at least once.
    expect(calls).toContain("2026-06-22T18:00:00Z");
    expect(calls).toContain("2026-06-22T20:00:00Z");
    expect(calls).toContain("2026-06-23T08:00:00Z");
    expect(calls).toContain("2026-06-16T00:00:00Z");
    expect(calls).toContain("2026-06-20T12:00:00Z");
  });
});
