/**
 * FederationAuditLog stories — H08 Cluster A surface 14.
 * Append-only ledger with signed envelopes inspectable per row.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type FalActorOption,
  type FalEventRow,
  FederationAuditLogSurface,
} from "./FederationAuditLogSurface.js";

const meta = { title: "H08/FederationAuditLog" } satisfies Meta;
export default meta;
type Story = StoryObj;

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
    id: "evt_1000",
    time: "27 Jun · 14:02",
    event: "Heartbeat",
    actorDid: "did:theourgia:aurora.example:_instance",
    summary: "aurora.example exchanged a heartbeat with this hub",
    envelopeJson:
      '{"id":"evt_1000","type":"Heartbeat","actor":"did:theourgia:aurora.example:_instance","latency_ms":84}',
  },
  {
    id: "evt_1002",
    time: "27 Jun · 09:30",
    event: "Accept",
    actorDid: MINE,
    summary:
      "You accepted the curation submission “Notes on the Heptameron”",
    envelopeJson:
      '{"id":"evt_1002","type":"Accept","actor":"' +
      MINE +
      '"}',
  },
  {
    id: "evt_1008",
    time: "24 Jun · 10:02",
    event: "Revoke",
    actorDid: "did:theourgia:hearth.sophia.example:theophrastos",
    summary: "Theophrastos revoked the officer role from a member",
    envelopeJson:
      '{"id":"evt_1008","type":"Revoke","from_role":"officer","to_role":"member"}',
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <FederationAuditLogSurface
        hubLabel="The Crossroads Coven"
        localZone="Europe/Athens"
        actorOptions={ACTORS}
        mineDid={MINE}
        rows={ROWS}
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <FederationAuditLogSurface
        hubLabel="The Crossroads Coven"
        localZone="Europe/Athens"
        actorOptions={ACTORS}
        mineDid={MINE}
        rows={[]}
      />
    </div>
  ),
};
