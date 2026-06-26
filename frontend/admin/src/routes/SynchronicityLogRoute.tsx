/**
 * Synchronicity Log — admin route wrapping SynchronicityLogSurface
 * (H06 §S7.9) + a hosted SynchronicityQuickCaptureModal (H06 §S7.10).
 *
 * Wires to the B120 backend:
 *   GET    /api/v1/synchronicities                        (list)
 *   POST   /api/v1/synchronicities                        (create from Capture)
 *
 * Pattern rail data is computed client-side from the day groups
 * until B124 (digest) ships. Pure presentation; the route owns the
 * grouping + the timestamp normalisation.
 */

import {
  type PatternCard,
  type SuggestedContextChip,
  type SyncCategoryId,
  type SyncLogDay,
  type SyncQuickCapturePayload,
  SynchronicityLogSurface,
  SynchronicityQuickCaptureModal,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "../data/api.js";

interface ApiSync {
  id: string;
  owner_id: string;
  occurred_at: string;
  description: string;
  category: SyncCategoryId;
  intensity: number;
  structured_data: Record<string, unknown>;
  astro_snapshot: Record<string, unknown> | null;
  calendar_stamp: Record<string, unknown> | null;
  weather_snapshot: Record<string, unknown> | null;
  location_lat: number | null;
  location_lng: number | null;
  location_precision: string;
  linked_entry_ids: string[];
  linked_entity_ids: string[];
  linked_working_ids: string[];
  created_at: string;
  updated_at: string;
}

function groupByDay(rows: readonly ApiSync[]): SyncLogDay[] {
  const buckets = new Map<string, ApiSync[]>();
  for (const r of rows) {
    const d = new Date(r.occurred_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  // Order: newest day first; newest item within a day first.
  const days: SyncLogDay[] = [];
  for (const [date_label, items] of buckets.entries()) {
    items.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() -
        new Date(a.occurred_at).getTime(),
    );
    days.push({
      date_label,
      astro_summary:
        // Pull astro hint from the first row's snapshot if present.
        (() => {
          const snap = items[0]?.astro_snapshot;
          if (!snap || typeof snap !== "object") return null;
          const sun = (snap as Record<string, unknown>).sun_sign;
          const moonPhase = (snap as Record<string, unknown>).moon_phase;
          const ph = (snap as Record<string, unknown>).planetary_hour;
          const parts: string[] = [];
          if (typeof sun === "string" && sun !== "unknown") {
            parts.push(`☉ ${sun}`);
          }
          if (typeof moonPhase === "string" && moonPhase !== "unknown") {
            parts.push(`☽ ${moonPhase}`);
          }
          if (typeof ph === "string" && ph !== "unknown") {
            parts.push(`hour ${ph}`);
          }
          return parts.length === 0 ? null : parts.join(" · ");
        })(),
      items: items.map((r) => ({
        id: r.id,
        time_label: new Date(r.occurred_at).toLocaleTimeString(
          undefined,
          { hour: "2-digit", minute: "2-digit" },
        ),
        description: r.description,
        category: r.category,
        intensity: r.intensity,
        entity_label: null,
      })),
    });
  }
  // Sort days newest-first.
  days.sort(
    (a, b) =>
      Date.parse(b.items[0]?.["time_label"] ?? "0") -
      Date.parse(a.items[0]?.["time_label"] ?? "0"),
  );
  return days;
}

function derivePatterns(rows: readonly ApiSync[]): PatternCard[] {
  // Placeholder until B124 digest. We surface a single observational
  // pattern based on the dominant category in the last 14 days.
  if (rows.length < 5) return [];
  const recentMs = 14 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - recentMs;
  const recent = rows.filter(
    (r) => Date.parse(r.occurred_at) >= cutoff,
  );
  if (recent.length < 5) return [];
  const counts = new Map<string, number>();
  for (const r of recent) {
    counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return [];
  const [category, n] = top;
  return [
    {
      id: `pattern-${category}`,
      text: `${category.replace(/_/g, " ")} syncs are the most-noticed category in your last 14 days.`,
      stat_label: `n=${n} of ${recent.length}`,
      small_sample: n < 10,
    },
  ];
}

export function SynchronicityLogRoute() {
  useTopbar(
    () => ({
      title: "Synchronicity Log",
      subtitle:
        "What you've noticed — recorded plainly, read as evidence.",
    }),
    [],
  );

  const [rows, setRows] = useState<readonly ApiSync[]>([]);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [contextLabel, setContextLabel] = useState<string | null>(null);

  const loadRows = useCallback(() => {
    apiClient
      .request<ApiSync[]>("/api/v1/synchronicities?limit=200", {
        method: "GET",
      })
      .then((data) => setRows(data))
      .catch((err) => {
        Toast.push({
          tone: "info",
          title: "Couldn't load synchronicities",
          body: String((err as Error).message ?? err),
        });
        setRows([]);
      });
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Build a context-label preview for the Quick-Capture modal —
  // derived from the most-recent row's astro_snapshot. The route's
  // live wiring to the Phase 03 astro engine ships later.
  useEffect(() => {
    if (rows.length === 0) {
      setContextLabel(null);
      return;
    }
    const snap = rows[0]?.astro_snapshot;
    if (!snap || typeof snap !== "object") {
      setContextLabel(null);
      return;
    }
    const sun = (snap as Record<string, unknown>).sun_sign;
    const ph = (snap as Record<string, unknown>).planetary_hour;
    const parts: string[] = ["Now"];
    if (typeof sun === "string" && sun !== "unknown") {
      parts.push(`☉ ${sun}`);
    }
    if (typeof ph === "string" && ph !== "unknown") {
      parts.push(`Hour of ${ph}`);
    }
    setContextLabel(parts.length > 1 ? parts.join(" · ") : null);
  }, [rows]);

  const days = useMemo(() => groupByDay(rows), [rows]);
  const patterns = useMemo(() => derivePatterns(rows), [rows]);

  const suggestedContext: SuggestedContextChip[] = useMemo(() => [], []);

  const handleCapture = useCallback(() => {
    setCaptureOpen(true);
  }, []);

  const handleCaptureSubmit = useCallback(
    (payload: SyncQuickCapturePayload) => {
      apiClient
        .request<ApiSync>("/api/v1/synchronicities", {
          method: "POST",
          json: {
            description: payload.description,
            category: payload.category,
            intensity: payload.intensity,
            structured_data: payload.structured_data,
            linked_entry_ids: payload.linked_entry_ids,
            linked_entity_ids: payload.linked_entity_ids,
            linked_working_ids: payload.linked_working_ids,
          },
        })
        .then(() => {
          setCaptureOpen(false);
          Toast.push({
            tone: "info",
            title: "Captured",
            body: "Noted — the log will reflect it on next refresh.",
          });
          loadRows();
        })
        .catch((err) => {
          Toast.push({
            tone: "info",
            title: "Capture failed",
            body: String((err as Error).message ?? err),
          });
        });
    },
    [loadRows],
  );

  const handleOpenItem = useCallback((id: string) => {
    Toast.push({
      tone: "info",
      title: "Detail view",
      body: `Per-sync detail surface ships in a follow-up. Selected ${id}.`,
    });
  }, []);

  const handleExport = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Export",
      body: "CSV export pipeline lands with B124 — for now the log is read-only.",
    });
  }, []);

  const handleViewPattern = useCallback((id: string) => {
    Toast.push({
      tone: "info",
      title: "View matching",
      body: `Pattern filter wiring ships with B122 query executor (id ${id}).`,
    });
  }, []);

  const handleDismissPattern = useCallback((_id: string) => {
    // No backend dismiss path until B124. For now we just remove
    // it from the local list.
    Toast.push({
      tone: "info",
      title: "Dismissed",
      body: "Pattern hidden for this session.",
    });
  }, []);

  return (
    <>
      <SynchronicityLogSurface
        days={days}
        patterns={patterns}
        total_recorded={rows.length}
        patterns_last_refreshed_label={
          patterns.length > 0 ? "Recomputed just now" : null
        }
        onCapture={handleCapture}
        onOpenItem={handleOpenItem}
        onExport={handleExport}
        onViewPattern={handleViewPattern}
        onDismissPattern={handleDismissPattern}
      />
      <SynchronicityQuickCaptureModal
        open={captureOpen}
        context_label={contextLabel}
        suggested_context={suggestedContext}
        onClose={() => setCaptureOpen(false)}
        onCapture={handleCaptureSubmit}
      />
    </>
  );
}
