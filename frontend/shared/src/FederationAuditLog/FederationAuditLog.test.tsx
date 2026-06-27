/**
 * FederationAuditLogSurface — unit tests.
 *
 * Defining honesty rules:
 *
 *   * **Append-only.** No edit/delete affordances render on rows.
 *   * Every row carries its signed envelope JSON, --font-mono,
 *     when expanded.
 *   * Tone families: Revoke → --warn (NEVER --danger).
 *   * Filters compose — actor + event + mine-only narrow the
 *     view together.
 *   * "Mine only" is OFF by default.
 *   * Export bundles the active filter triple.
 *   * Empty-state copy verbatim.
 *   * Zone disclosure verbatim.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  FederationAuditLogSurface,
  type FalActorOption,
  type FalEventRow,
} from "./FederationAuditLogSurface.js";
import {
  FAL_EMPTY_BODY,
  FAL_EMPTY_TITLE,
  FAL_EVENT_KEYS,
  FAL_EVENT_TONES,
  FAL_EXPORT_CTA,
  FAL_TOGGLE_MINE,
} from "./copy.js";

const MINE = "did:theourgia:hearth.sophia.example:aspasia";

const ACTORS: FalActorOption[] = [
  { value: "all", label: "All actors" },
  { value: MINE, label: "You — Aspasia" },
  {
    value: "did:theourgia:hearth.sophia.example:theophrastos",
    label: "Theophrastos (officer)",
  },
];

const ROWS: FalEventRow[] = [
  {
    id: "evt_1",
    time: "27 Jun · 14:02",
    event: "Heartbeat",
    actorDid: "did:theourgia:aurora.example:_instance",
    summary:
      "aurora.example exchanged a heartbeat with this hub",
    envelopeJson:
      '{"id":"evt_1","type":"Heartbeat","actor":"did:theourgia:aurora.example:_instance"}',
  },
  {
    id: "evt_2",
    time: "27 Jun · 09:30",
    event: "Accept",
    actorDid: MINE,
    summary:
      "You accepted the curation submission “Notes on the Heptameron”",
    envelopeJson:
      '{"id":"evt_2","type":"Accept","actor":"' + MINE + '"}',
  },
  {
    id: "evt_3",
    time: "24 Jun · 10:02",
    event: "Revoke",
    actorDid: "did:theourgia:hearth.sophia.example:theophrastos",
    summary:
      "Theophrastos revoked the officer role from a member",
    envelopeJson:
      '{"id":"evt_3","type":"Revoke","actor":"did:theourgia:hearth.sophia.example:theophrastos"}',
  },
];

function renderLog(
  overrides: Partial<
    Parameters<typeof FederationAuditLogSurface>[0]
  > = {},
) {
  return render(
    <FederationAuditLogSurface
      hubLabel="The Crossroads Coven"
      localZone="Europe/Athens"
      actorOptions={ACTORS}
      mineDid={MINE}
      rows={ROWS}
      {...overrides}
    />,
  );
}

// ─── Chrome ────────────────────────────────────────────────────────

describe("FederationAuditLogSurface — chrome", () => {
  it("renders the hub crumb + 'Admin' suffix", () => {
    renderLog();
    expect(
      document.querySelector("[data-field='hub-crumb']")?.textContent,
    ).toBe("The Crossroads Coven · Admin");
  });

  it("renders the zone disclosure verbatim", () => {
    renderLog();
    expect(
      document.querySelector("[data-field='zone-disclosure']")
        ?.textContent,
    ).toBe("Times shown in your local zone (Europe/Athens)");
  });

  it("count label pluralises correctly", () => {
    renderLog({ rows: [ROWS[0]] });
    expect(
      document.querySelector("[data-field='count-label']")?.textContent,
    ).toBe("1 event");
  });
});

// ─── Append-only ────────────────────────────────────────────────

describe("FederationAuditLogSurface — append-only", () => {
  it("rows render no edit/delete affordances", () => {
    renderLog();
    // The only buttons per-row are toggle + the export band's
    // export CTA. There are no edit or delete buttons.
    expect(
      document.querySelectorAll("[data-action='delete-row']"),
    ).toHaveLength(0);
    expect(
      document.querySelectorAll("[data-action='edit-row']"),
    ).toHaveLength(0);
  });
});

// ─── Signed envelope ────────────────────────────────────────────

describe("FederationAuditLogSurface — signed envelope", () => {
  it("expanding a row reveals the signed envelope JSON in --font-mono", () => {
    renderLog();
    const row = document.querySelector(
      "[data-row-id='evt_1']",
    ) as HTMLElement;
    expect(
      row.querySelector("[data-field='row-envelope']"),
    ).toBeNull();
    fireEvent.click(
      row.querySelector("[data-action='toggle-row']") as HTMLElement,
    );
    const envelope = row.querySelector(
      "[data-field='row-envelope']",
    ) as HTMLElement;
    expect(envelope).not.toBeNull();
    expect(envelope.textContent).toBe(ROWS[0].envelopeJson);
    expect(envelope.style.fontFamily).toContain("font-mono");
  });

  it("collapses on second toggle", () => {
    renderLog();
    const row = document.querySelector(
      "[data-row-id='evt_2']",
    ) as HTMLElement;
    const toggle = row.querySelector(
      "[data-action='toggle-row']",
    ) as HTMLElement;
    fireEvent.click(toggle);
    expect(
      row.querySelector("[data-field='row-envelope']"),
    ).not.toBeNull();
    fireEvent.click(toggle);
    expect(
      row.querySelector("[data-field='row-envelope']"),
    ).toBeNull();
  });
});

// ─── Tone families ─────────────────────────────────────────────

describe("FederationAuditLogSurface — tone families", () => {
  it("Revoke uses --warn chrome (never --danger)", () => {
    renderLog();
    const row = document.querySelector(
      "[data-row-id='evt_3']",
    ) as HTMLElement;
    const chip = row.querySelector(
      "[data-field='row-event-chip']",
    ) as HTMLElement;
    expect(chip.getAttribute("data-tone")).toBe("warn");
    expect(chip.style.color).toContain("--warn");
    expect(chip.style.background).toContain("--warn-soft");
    expect(chip.style.color).not.toContain("--danger");
    expect(chip.style.background).not.toContain("--danger");
  });

  it("Heartbeat uses --remote chrome", () => {
    renderLog();
    const row = document.querySelector(
      "[data-row-id='evt_1']",
    ) as HTMLElement;
    const chip = row.querySelector(
      "[data-field='row-event-chip']",
    ) as HTMLElement;
    expect(chip.getAttribute("data-tone")).toBe("remote");
    expect(chip.style.color).toContain("--remote");
  });

  it("Accept uses --peer-ok chrome", () => {
    renderLog();
    const row = document.querySelector(
      "[data-row-id='evt_2']",
    ) as HTMLElement;
    const chip = row.querySelector(
      "[data-field='row-event-chip']",
    ) as HTMLElement;
    expect(chip.getAttribute("data-tone")).toBe("peer-ok");
    expect(chip.style.color).toContain("--peer-ok");
  });

  it("the tone map covers every event in FAL_EVENT_KEYS", () => {
    for (const ev of FAL_EVENT_KEYS) {
      expect(FAL_EVENT_TONES[ev]).toBeDefined();
    }
  });
});

// ─── Filters compose ──────────────────────────────────────────

describe("FederationAuditLogSurface — filters compose", () => {
  it("event filter narrows to one row", () => {
    renderLog();
    const accept = document.querySelector(
      "[data-event-filter='Accept']",
    ) as HTMLElement;
    fireEvent.click(accept);
    expect(
      document.querySelectorAll("[data-row-id]"),
    ).toHaveLength(1);
    expect(
      document.querySelector("[data-row-id]")?.getAttribute("data-event"),
    ).toBe("Accept");
  });

  it("actor filter + event filter compose", () => {
    renderLog();
    const actorSelect = document.querySelector(
      "[data-field='actor-select']",
    ) as HTMLSelectElement;
    fireEvent.change(actorSelect, { target: { value: MINE } });
    // Both Accept rows by MINE remain after both filters compose:
    expect(
      document.querySelectorAll("[data-row-id]"),
    ).toHaveLength(1);
    expect(
      document.querySelector("[data-row-id]")?.getAttribute("data-row-id"),
    ).toBe("evt_2");
  });

  it("mine-only is OFF by default", () => {
    renderLog();
    const sw = document.querySelector(
      "[data-field='mine-only-switch']",
    ) as HTMLElement;
    expect(sw.getAttribute("aria-checked")).toBe("false");
    // All three rows visible.
    expect(
      document.querySelectorAll("[data-row-id]"),
    ).toHaveLength(3);
  });

  it("toggling mine-only narrows to MINE-actor rows", () => {
    renderLog();
    const sw = document.querySelector(
      "[data-field='mine-only-switch']",
    ) as HTMLElement;
    fireEvent.click(sw);
    expect(
      document.querySelectorAll("[data-row-id]"),
    ).toHaveLength(1);
  });
});

// ─── Empty + export ────────────────────────────────────────────

describe("FederationAuditLogSurface — empty + export", () => {
  it("empty-state copy is verbatim", () => {
    renderLog({ rows: [] });
    expect(screen.getByText(FAL_EMPTY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(FAL_EMPTY_BODY)).toBeInTheDocument();
  });

  it("export fires onExportCsv with active filter triple", () => {
    const onExportCsv = vi.fn();
    renderLog({ onExportCsv });
    fireEvent.change(
      document.querySelector(
        "[data-field='time-range']",
      ) as HTMLSelectElement,
      { target: { value: "Last 30 days" } },
    );
    fireEvent.click(
      document.querySelector(
        "[data-event-filter='Accept']",
      ) as HTMLElement,
    );
    fireEvent.click(screen.getByText(FAL_EXPORT_CTA));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(onExportCsv.mock.calls[0][0]).toMatchObject({
      actor: "all",
      event: "Accept",
      timeRange: "Last 30 days",
      mineOnly: false,
      count: 1,
    });
  });
});

// ─── Smoke ────────────────────────────────────────────────────

describe("FederationAuditLogSurface — smoke", () => {
  it("renders the toggle copy verbatim", () => {
    renderLog();
    expect(screen.getByText(FAL_TOGGLE_MINE)).toBeInTheDocument();
  });

  it("renders every event-type chip", () => {
    renderLog();
    for (const k of FAL_EVENT_KEYS) {
      expect(
        document.querySelector(`[data-event-filter='${k}']`),
      ).not.toBeNull();
    }
    expect(
      document.querySelector("[data-event-filter='All']"),
    ).not.toBeNull();
  });
});
