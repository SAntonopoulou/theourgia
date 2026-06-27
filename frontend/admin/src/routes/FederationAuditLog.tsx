/**
 * FederationAuditLog — admin route at
 * ``/hubs/:hubId/admin/audit``.
 *
 * Renders the H08 §S3 Cluster A surface 14 against fixtures.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/hubs/{hubId}/audit — append-only log slice
 *     bounded by the time-range query param. The frontend filters
 *     actor / event / mine-only locally on the slice; switching
 *     time range refetches.
 *   * GET /api/v1/hubs/{hubId}/audit.csv — server-rendered CSV of
 *     signed envelopes, with the same filter set as the active
 *     view. The "Export CSV" CTA hands the active filters to the
 *     route — the route is responsible for assembling the URL
 *     and triggering the download.
 */

import {
  type FalActorOption,
  type FalEventRow,
  FederationAuditLogSurface,
  useTopbar,
} from "@theourgia/shared";
import { useParams } from "react-router-dom";

const MINE = "did:theourgia:hearth.sophia.example:aspasia";

const ACTORS: FalActorOption[] = [
  { value: "all", label: "All actors" },
  { value: MINE, label: "You — Aspasia" },
  {
    value: "did:theourgia:hearth.sophia.example:theophrastos",
    label: "Theophrastos (officer)",
  },
  {
    value: "did:theourgia:terra.example:diotima",
    label: "Diotima (member)",
  },
  {
    value: "did:theourgia:aurora.example:_instance",
    label: "aurora.example (peer)",
  },
];

function envelope(
  id: string,
  type: string,
  actor: string,
  extra: Record<string, unknown>,
): string {
  return JSON.stringify(
    {
      id: `evt_${id}`,
      ts: "2026-06-27T14:02:00+03:00",
      type,
      actor,
      ...extra,
      sig: `ed25519:${actor.split(":").pop()?.slice(0, 4) ?? "x"}…9f3a2c`,
    },
    null,
    2,
  );
}

const ROWS: FalEventRow[] = [
  {
    id: "evt_1000",
    time: "27 Jun · 14:02",
    event: "Heartbeat",
    actorDid: "did:theourgia:aurora.example:_instance",
    summary:
      "aurora.example exchanged a heartbeat with this hub",
    envelopeJson: envelope(
      "1000",
      "Heartbeat",
      "did:theourgia:aurora.example:_instance",
      { latency_ms: 84 },
    ),
  },
  {
    id: "evt_1001",
    time: "27 Jun · 11:48",
    event: "Comment",
    actorDid: "did:theourgia:thelema.example:frater-lux",
    summary:
      "Frater Lux commented on the published rite “Dark-moon Deipnon”",
    envelopeJson: envelope(
      "1001",
      "Comment",
      "did:theourgia:thelema.example:frater-lux",
      { remote: true, length: 212 },
    ),
  },
  {
    id: "evt_1002",
    time: "27 Jun · 09:30",
    event: "Accept",
    actorDid: MINE,
    summary:
      "You accepted the curation submission “Notes on the Heptameron”",
    envelopeJson: envelope("1002", "Accept", MINE, {
      contributor: "did:theourgia:terra.example:diotima",
    }),
  },
  {
    id: "evt_1003",
    time: "26 Jun · 22:14",
    event: "Push",
    actorDid: "did:theourgia:terra.example:diotima",
    summary: "Diotima pushed a working to this hub",
    envelopeJson: envelope(
      "1003",
      "Push",
      "did:theourgia:terra.example:diotima",
      { visibility: "network" },
    ),
  },
  {
    id: "evt_1004",
    time: "26 Jun · 18:05",
    event: "RitualUpdate",
    actorDid: MINE,
    summary:
      "You changed the start time of “Solstice vigil” by 30 minutes",
    envelopeJson: envelope("1004", "RitualUpdate", MINE, {
      from: "21:00 EEST",
      to: "21:30 EEST",
    }),
  },
  {
    id: "evt_1005",
    time: "26 Jun · 16:40",
    event: "Invite",
    actorDid:
      "did:theourgia:hearth.sophia.example:theophrastos",
    summary:
      "Theophrastos invited a practitioner to join the hub",
    envelopeJson: envelope(
      "1005",
      "Invite",
      "did:theourgia:hearth.sophia.example:theophrastos",
      { role: "member" },
    ),
  },
  {
    id: "evt_1006",
    time: "25 Jun · 20:11",
    event: "RitualSchedule",
    actorDid: MINE,
    summary:
      "You scheduled the group ritual “Dark-moon Deipnon”",
    envelopeJson: envelope("1006", "RitualSchedule", MINE, {
      participants: 5,
      location: "dispersed",
    }),
  },
  {
    id: "evt_1007",
    time: "25 Jun · 13:27",
    event: "Mirror",
    actorDid: "did:theourgia:aurora.example:_instance",
    summary:
      "aurora.example mirrored a public publication from this hub",
    envelopeJson: envelope(
      "1007",
      "Mirror",
      "did:theourgia:aurora.example:_instance",
      { remote: true, cache_ttl: "7d" },
    ),
  },
  {
    id: "evt_1008",
    time: "24 Jun · 10:02",
    event: "Revoke",
    actorDid:
      "did:theourgia:hearth.sophia.example:theophrastos",
    summary:
      "Theophrastos revoked the officer role from a member",
    envelopeJson: envelope(
      "1008",
      "Revoke",
      "did:theourgia:hearth.sophia.example:theophrastos",
      { from_role: "officer", to_role: "member" },
    ),
  },
  {
    id: "evt_1009",
    time: "24 Jun · 08:55",
    event: "Pull",
    actorDid: MINE,
    summary:
      "You pulled the latest member roster from this hub",
    envelopeJson: envelope("1009", "Pull", MINE, { rows: 31 }),
  },
  {
    id: "evt_1010",
    time: "23 Jun · 19:36",
    event: "Accept",
    actorDid:
      "did:theourgia:hearth.sophia.example:theophrastos",
    summary: "Theophrastos accepted a federation peer",
    envelopeJson: envelope(
      "1010",
      "Accept",
      "did:theourgia:hearth.sophia.example:theophrastos",
      { handshake: "successful" },
    ),
  },
  {
    id: "evt_1011",
    time: "23 Jun · 07:18",
    event: "Heartbeat",
    actorDid: "did:theourgia:thelema.example:_instance",
    summary:
      "thelema.example exchanged a heartbeat with this hub",
    envelopeJson: envelope(
      "1011",
      "Heartbeat",
      "did:theourgia:thelema.example:_instance",
      { latency_ms: 163 },
    ),
  },
];

export function FederationAuditLog() {
  const { hubId } = useParams<{ hubId: string }>();

  useTopbar(() => ({ title: "Audit log" }));

  return (
    <FederationAuditLogSurface
      hubLabel="The Crossroads Coven"
      localZone="Europe/Athens"
      actorOptions={ACTORS}
      mineDid={MINE}
      rows={ROWS}
      onTimeRangeChange={(timeRange) => {
        // TODO Phase 12 — refetch the slice with the new window.
        // eslint-disable-next-line no-console
        console.info(
          "[audit-log] time range change",
          hubId,
          timeRange,
        );
      }}
      onExportCsv={(filters) => {
        // TODO Phase 12 — hit /api/v1/hubs/{hubId}/audit.csv
        // with the active filters as querystring params; trigger
        // a browser download. The CSV preserves the signed
        // envelopes verbatim — forensic artefact, not summary.
        // eslint-disable-next-line no-console
        console.info("[audit-log] export csv", hubId, filters);
      }}
    />
  );
}
