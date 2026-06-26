/**
 * Per-Study Page — admin route wrapping PerStudyPageSurface
 * (H06 §S7.3).
 *
 * Wires to:
 *   GET   /api/v1/studies/{id}                          (B112)
 *   GET   /api/v1/studies/{id}/snapshots                (B112)
 *   POST  /api/v1/studies/{id}/run                      (B112 run)
 *   PATCH /api/v1/studies/{id}/snapshots/{snap}         (notes — interpretation)
 */

import {
  PerStudyPageSurface,
  type PerStudyKind,
  type PerStudyRecord,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface ApiStudy {
  id: string;
  name: string;
  kind: PerStudyKind;
  description: string | null;
  query: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ApiSnapshot {
  id: string;
  study_id: string;
  results: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function timeLabel(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const date = new Date(then);
  return `Last run ${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function deriveSampleSize(
  kind: PerStudyKind,
  results: Record<string, unknown>,
): number {
  if (kind === "gematria_search") {
    const arr = Array.isArray(results.results) ? results.results : [];
    return arr.length;
  }
  if (kind === "gematria_calculation") {
    const arr = Array.isArray(results.per_cipher) ? results.per_cipher : [];
    return arr.length;
  }
  return 0;
}

export function PerStudyPageRoute() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const studyId = params.id ?? "";

  const [record, setRecord] = useState<PerStudyRecord | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingInterpretation, setSavingInterpretation] = useState(false);

  useTopbar(
    () => ({
      title: record?.name ?? "Study",
      subtitle: record?.description ?? "",
    }),
    [record?.name, record?.description],
  );

  // Initial load: study + latest snapshot.
  useEffect(() => {
    if (!studyId) return;
    let cancelled = false;
    Promise.all([
      apiClient.request<ApiStudy>(`/api/v1/studies/${studyId}`, {
        method: "GET",
      }),
      apiClient.request<ApiSnapshot[]>(
        `/api/v1/studies/${studyId}/snapshots`,
        { method: "GET" },
      ),
    ])
      .then(([study, snapshots]) => {
        if (cancelled) return;
        const latest = snapshots[snapshots.length - 1] ?? null;
        const results = latest?.results ?? null;
        const sample_size = results
          ? deriveSampleSize(study.kind, results)
          : 0;
        setRecord({
          id: study.id,
          name: study.name,
          description: study.description ?? "Saved query.",
          kind: study.kind,
          last_run_label: latest ? timeLabel(latest.created_at) : null,
          snapshot_results: results,
          sample_size,
          linked_workings: [],
          interpretation: latest?.notes ?? "",
        });
        setSnapshotId(latest?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        Toast.push({
          tone: "info",
          title: "Couldn't load study",
          body: String((err as Error).message ?? err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  const handleBack = useCallback(() => {
    navigate("/studies");
  }, [navigate]);

  const handleEditQuery = useCallback(() => {
    // Queries are immutable after first save (B112 rule). The
    // "Edit" CTA scrolls the practitioner to the query summary;
    // we Toast a friendly explainer for now.
    Toast.push({
      tone: "info",
      title: "Queries are immutable",
      body: "Saved studies preserve the original query. To refine, save a new search from the Search surface.",
    });
  }, []);

  const handleInsertIntoDraft = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Insert into draft",
      body: "Tiptap entry integration lands in a follow-up — the study reference is staged.",
    });
  }, []);

  const handleRefresh = useCallback(() => {
    if (!studyId) return;
    setRefreshing(true);
    apiClient
      .request<ApiSnapshot>(`/api/v1/studies/${studyId}/run`, {
        method: "POST",
      })
      .then((snap) => {
        setRecord((cur) =>
          cur
            ? {
                ...cur,
                snapshot_results: snap.results,
                sample_size: deriveSampleSize(cur.kind, snap.results),
                last_run_label: timeLabel(snap.created_at),
                interpretation: snap.notes ?? "",
              }
            : cur,
        );
        setSnapshotId(snap.id);
        Toast.push({
          tone: "info",
          title: "Snapshot recorded",
          body: "The chart was refreshed. Previous snapshots are kept.",
        });
      })
      .catch((err) => {
        Toast.push({
          tone: "info",
          title: "Refresh failed",
          body: String((err as Error).message ?? err),
        });
      })
      .finally(() => setRefreshing(false));
  }, [studyId]);

  const handleInterpretation = useCallback(
    (next: string) => {
      // Local-first; debounce the PATCH so quick typing doesn't
      // saturate the snapshot.notes endpoint.
      setRecord((cur) => (cur ? { ...cur, interpretation: next } : cur));
      if (!studyId || !snapshotId || savingInterpretation) return;
      setSavingInterpretation(true);
      apiClient
        .request<ApiSnapshot>(
          `/api/v1/studies/${studyId}/snapshots/${snapshotId}`,
          {
            method: "PATCH",
            json: { notes: next },
          },
        )
        .catch(() => {
          /* swallow — interpretation will retry on next change */
        })
        .finally(() => setSavingInterpretation(false));
    },
    [studyId, snapshotId, savingInterpretation],
  );

  if (!record) {
    return (
      <div
        style={{
          padding: "9vh 0",
          textAlign: "center",
          color: "var(--ink-mute)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
        }}
      >
        Loading study…
      </div>
    );
  }

  return (
    <PerStudyPageSurface
      record={record}
      onBack={handleBack}
      onEditQuery={handleEditQuery}
      onInsertIntoDraft={handleInsertIntoDraft}
      onInterpretationChange={handleInterpretation}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    />
  );
}
