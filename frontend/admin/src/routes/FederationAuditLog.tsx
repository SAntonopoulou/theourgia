/**
 * FederationAuditLog — admin route at ``/hubs/:hubId/admin/audit``.
 *
 * Wired to ``GET /api/v1/hubs/:hubId/audit`` per the admin API-wiring
 * convention. CSV export goes directly to ``/audit.csv`` (forensic
 * artefact — preserves the signed envelopes verbatim).
 *
 * The surface does client-side filtering on actor + event within the
 * current time-range slice; switching time range triggers a refetch.
 */

import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  type FalActorOption,
  type FalEventKey,
  type FalEventRow,
  FederationAuditLogSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type AuditEvent,
  type AuditTimeRange,
  hubAuditCsvUrl,
  useHubAuditLog,
} from "../lib/federation.js";

const SURFACE_TIME_RANGE_MAP: Record<string, AuditTimeRange> = {
  "7d": "last_7_days",
  "30d": "last_30_days",
  "90d": "last_90_days",
  all: "all_time",
};

function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} · ${hh}:${mm}`;
}

function shortenDid(did: string | null): string {
  if (!did) return "system";
  // The audit log carries actor_id (UUID) for now; once actor DIDs
  // are resolved the surface will show a friendly label. Until then
  // we render the first 8 chars as a stable identifier.
  return did.slice(0, 8);
}

// Map backend audit-event actions to the surface's federation
// envelope vocabulary. Actions outside this set are filtered out for
// now; once the surface accepts arbitrary keys this filter goes away.
const ACTION_TO_FAL: Record<string, FalEventKey> = {
  "federation.push": "Push",
  "federation.pull": "Pull",
  "federation.mirror": "Mirror",
  "federation.invite": "Invite",
  "federation.accept": "Accept",
  "federation.revoke": "Revoke",
  "federation.ritual_schedule": "RitualSchedule",
  "federation.ritual_update": "RitualUpdate",
  "federation.comment": "Comment",
  "federation.heartbeat": "Heartbeat",
};

function toRow(event: AuditEvent): FalEventRow | null {
  const falEvent = ACTION_TO_FAL[event.action];
  if (!falEvent) return null;
  return {
    id: event.id,
    time: formatLocalTime(event.created_at),
    event: falEvent,
    actorDid: event.actor_id ?? "system",
    summary: `${falEvent} (${event.outcome}) by ${shortenDid(event.actor_id)}`,
    envelopeJson: JSON.stringify(
      {
        id: event.id,
        ts: event.created_at,
        kind: event.kind,
        action: event.action,
        actor_id: event.actor_id,
        hub_id: event.hub_id,
        outcome: event.outcome,
        detail: event.detail,
      },
      null,
      2,
    ),
  };
}

function deriveActorOptions(events: readonly AuditEvent[]): FalActorOption[] {
  const seen = new Set<string>();
  for (const e of events) {
    if (e.actor_id) seen.add(e.actor_id);
  }
  return [
    { value: "all", label: "All actors" },
    ...Array.from(seen).map((did) => ({
      value: did,
      label: shortenDid(did),
    })),
  ];
}

export function FederationAuditLog() {
  const { hubId } = useParams<{ hubId: string }>();
  useTopbar(() => ({ title: "Audit log" }));

  const [timeRange, setTimeRange] = useState<AuditTimeRange>("last_7_days");
  const { data, isLoading, error, refetch } = useHubAuditLog(hubId, timeRange);

  const rows = useMemo(
    () =>
      data
        ? (data
            .map(toRow)
            .filter((r): r is FalEventRow => r !== null))
        : [],
    [data],
  );
  const actorOptions = useMemo(
    () => deriveActorOptions(data ?? []),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={6} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load the audit log."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <FederationAuditLogSurface
      hubLabel="This hub"
      localZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      actorOptions={actorOptions}
      mineDid=""
      rows={rows}
      onTimeRangeChange={(surfaceRange) => {
        const mapped = SURFACE_TIME_RANGE_MAP[surfaceRange] ?? "last_7_days";
        setTimeRange(mapped);
      }}
      onExportCsv={(filters) => {
        if (!hubId) return;
        const url = hubAuditCsvUrl(
          hubId,
          timeRange,
          filters.actor,
          filters.event,
        );
        // Trigger a browser download by navigating to the URL.
        window.location.href = url;
      }}
    />
  );
}
