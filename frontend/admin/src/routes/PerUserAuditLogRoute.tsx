/**
 * PerUserAuditLog — H10 B4 admin route.
 *
 * Wires the per-user audit log against /api/v1/me/audit. The surface's
 * actor filter ("all" / "you" / "agents" / "system") is purely
 * client-side for v1 — the backend endpoint returns events the user is
 * the actor of; "system" and "agents" subsets are derived from the
 * action prefix.
 *
 * Outcomes from the wire are normalised to the surface's three-bucket
 * scheme: { success | failure | denied }.
 *
 * Mounted at /settings/audit.
 */

import {
  type AuditLogRow,
  PerUserAuditLogSurface,
  PerUserAuditLogCopy,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

type Actor = (typeof PerUserAuditLogCopy.ACTOR_OPTIONS)[number]["key"];
type Kind = (typeof PerUserAuditLogCopy.KIND_OPTIONS)[number]["key"];
type Range = (typeof PerUserAuditLogCopy.TIME_RANGE_OPTIONS)[number]["key"];

const ACTOR_PREFIXES: Record<Exclude<Actor, "all">, readonly string[]> = {
  you: [
    "user.",
    "entry.",
    "vault.",
    "visibility.",
    "session.create",
    "session.refresh",
  ],
  agents: ["agent."],
  system: ["system.", "reaper.", "federation.", "newsletter."],
};

function actorOfAction(action: string): Exclude<Actor, "all"> {
  if (ACTOR_PREFIXES.agents.some((p) => action.startsWith(p))) return "agents";
  if (ACTOR_PREFIXES.system.some((p) => action.startsWith(p))) return "system";
  return "you";
}

function normaliseOutcome(raw: string): AuditLogRow["outcome"] {
  if (raw === "success") return "success";
  if (raw === "denied" || raw === "blocked") return "denied";
  return "failure";
}

function localTime(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PerUserAuditLogRoute() {
  useTopbar(() => ({
    title: "Your audit log",
    subtitle: "Every action on your account, in plain words",
  }));

  const [actor, setActor] = useState<Actor>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [timeRange, setTimeRange] = useState<Range>("last_30_days");

  const query = useQuery({
    queryKey: ["me-audit", kind, timeRange],
    queryFn: async () =>
      apiMethods.listMyAudit({
        kind,
        time_range: timeRange,
        limit: 200,
      }),
    staleTime: 15_000,
  });

  const localZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  }, []);

  const rows = useMemo<AuditLogRow[]>(() => {
    const events = query.data?.events ?? [];
    const filtered =
      actor === "all"
        ? events
        : events.filter((e) => actorOfAction(e.action) === actor);
    return filtered.map<AuditLogRow>((e) => ({
      id: e.id,
      time: localTime(e.created_at),
      action: `${e.action} · ${e.kind}`,
      outcome: normaliseOutcome(e.outcome),
      raw: JSON.stringify(
        {
          id: e.id,
          kind: e.kind,
          action: e.action,
          outcome: e.outcome,
          detail: e.detail,
          created_at: e.created_at,
        },
        null,
        2,
      ),
    }));
  }, [query.data, actor]);

  return (
    <PerUserAuditLogSurface
      rows={rows}
      localZone={localZone}
      actor={actor}
      kind={kind}
      timeRange={timeRange}
      onActorChange={setActor}
      onKindChange={setKind}
      onTimeRangeChange={setTimeRange}
    />
  );
}
