/**
 * SessionsAndDevices — H10 B6 admin route.
 *
 * Wires /api/v1/me/sessions and friends. The backend's `device_label`
 * comes through pre-formatted ("Laptop · Firefox"); IP is rendered
 * as a calm geo placeholder ("Unknown location") until reverse-DNS or
 * IP-geo lands. Rule 48 — no token IDs ever appear in chrome; the
 * session UUIDs only travel via callback signatures.
 *
 * Mounted at /settings/sessions.
 */

import {
  type CurrentSession,
  type SessionRow,
  SessionsAndDevicesSurface,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { apiMethods } from "../data/api.js";

function lastSeenRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function kindFromLabel(label: string): "laptop" | "phone" | "tablet" | "desktop" {
  const lower = label.toLowerCase();
  if (lower.startsWith("phone")) return "phone";
  if (lower.startsWith("tablet")) return "tablet";
  if (lower.startsWith("desktop")) return "desktop";
  return "laptop";
}

export function SessionsAndDevicesRoute() {
  useTopbar(() => ({
    title: "Sessions & devices",
    subtitle: "What's signed in, where, and when",
  }));

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["me-sessions"],
    queryFn: async () => apiMethods.listMySessions(),
    staleTime: 15_000,
  });

  const revokeOne = useMutation({
    mutationFn: async (sessionId: string) =>
      apiMethods.revokeMySession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-sessions"] }),
  });

  const revokeOthers = useMutation({
    mutationFn: async () => apiMethods.revokeOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-sessions"] }),
  });

  const { current, others } = useMemo<{
    current: CurrentSession;
    others: SessionRow[];
  }>(() => {
    const sessions = query.data?.sessions ?? [];
    const currentRow = sessions.find((s) => s.is_current);
    const otherRows = sessions.filter((s) => !s.is_current);
    return {
      current: {
        device: currentRow?.device_label ?? "This device",
        status: "Active now",
        kind: kindFromLabel(currentRow?.device_label ?? "laptop"),
      },
      others: otherRows.map<SessionRow>((s) => ({
        id: s.id,
        device: s.device_label,
        geo: s.ip_address ? `${s.ip_address}` : "Unknown location",
        lastSeen: lastSeenRelative(s.last_used_at),
        kind: kindFromLabel(s.device_label),
      })),
    };
  }, [query.data]);

  return (
    <SessionsAndDevicesSurface
      current={current}
      others={others}
      onSignOut={(id) => revokeOne.mutate(id)}
      onSignOutEverywhereElse={() => revokeOthers.mutate()}
    />
  );
}
