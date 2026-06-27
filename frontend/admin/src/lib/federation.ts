/**
 * Federation hub API — audit log + member/role queries.
 *
 * Backend contract: `backend/theourgia/api/routers/v1/federation_audit.py`
 * (per-hub audit log + CSV export).
 */

import {
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";

import { apiGet } from "./api.js";

export type AuditTimeRange =
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "all_time";

export interface AuditEvent {
  id: string;
  kind: string;
  action: string;
  actor_id: string | null;
  hub_id: string | null;
  outcome: string;
  detail: Record<string, unknown>;
  created_at: string;
}

interface AuditListResponse {
  events: AuditEvent[];
  total: number;
}

export function useHubAuditLog(
  hubId: string | undefined,
  timeRange: AuditTimeRange,
): UseQueryResult<AuditEvent[], Error> {
  return useQuery<AuditEvent[], Error>({
    queryKey: ["federation", "audit", hubId, timeRange],
    enabled: !!hubId,
    queryFn: async () => {
      const data = await apiGet<AuditListResponse>(
        `/hubs/${hubId}/audit?time_range=${timeRange}`,
      );
      return data.events;
    },
  });
}

export function hubAuditCsvUrl(
  hubId: string,
  timeRange: AuditTimeRange,
  actor?: string,
  event?: string,
): string {
  const params = new URLSearchParams({ time_range: timeRange });
  if (actor && actor !== "all") params.set("actor", actor);
  if (event && event !== "all") params.set("event", event);
  return `/api/v1/hubs/${hubId}/audit.csv?${params.toString()}`;
}
