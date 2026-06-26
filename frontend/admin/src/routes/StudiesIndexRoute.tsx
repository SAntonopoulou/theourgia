/**
 * Saved Studies — admin route wrapping StudiesIndexSurface
 * (H06 §S7.5).
 *
 * Wires to GET /api/v1/studies (B112). The B112 endpoint returns
 * Studies with their stored queries; we synthesise the card
 * metadata (last_run_label, sample_size, small_sample, stale)
 * by fetching the latest snapshot per study in a follow-up.
 *
 * For now the card metadata comes from the study row itself
 * (created_at as the run label · 0 sample size when no snapshot
 * yet). The full picture lands when the per-study route ships.
 */

import {
  StudiesIndexSurface,
  type StudyCard,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface ApiStudy {
  id: string;
  owner_id: string | null;
  name: string;
  kind: "gematria_search" | "gematria_calculation";
  query: Record<string, unknown>;
  description: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

function timeSinceLabel(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "saved";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  if (seconds < 60) return "saved just now";
  if (seconds < 3600) return `saved ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `saved ${Math.floor(seconds / 3600)}h ago`;
  return `saved ${Math.floor(seconds / 86400)}d ago`;
}

function thumbHintFor(
  kind: "gematria_search" | "gematria_calculation",
): "bars" | "heat" | "line" {
  return kind === "gematria_search" ? "heat" : "bars";
}

export function StudiesIndexRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Saved Studies",
      subtitle:
        "A query you keep running, named, with your interpretation kept beside it.",
    }),
    [],
  );

  const [studies, setStudies] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .request<ApiStudy[]>("/api/v1/studies?limit=100", { method: "GET" })
      .then((rows) => {
        if (cancelled) return;
        setStudies(
          rows.map<StudyCard>((r) => ({
            id: r.id,
            name: r.name,
            kind: r.kind,
            description: r.description ?? "Saved query.",
            // Snapshot metadata lands with the per-study fetch;
            // until then the card surfaces the study's own
            // updated_at as the "run" label.
            last_run_label: timeSinceLabel(r.updated_at),
            sample_size: 0,
            small_sample: false,
            stale: false,
            bundled: r.owner_id === null,
            thumb_hint: thumbHintFor(r.kind),
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        Toast.push({
          tone: "info",
          title: "Couldn't load studies",
          body: String((err as Error).message ?? err),
        });
        setStudies([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = useCallback((id: string) => {
    navigate(`/studies/${id}`);
  }, [navigate]);

  const handleNew = useCallback(() => {
    // The H06 design routes "New study" to the Query Builder
    // surface, which we haven't ported yet — for now navigate
    // to the Cross-Journal Search surface (the most common
    // entry point for saving a study).
    navigate("/gematria/search");
  }, [navigate]);

  return (
    <StudiesIndexSurface
      studies={studies}
      loading={loading}
      onOpen={handleOpen}
      onNew={handleNew}
    />
  );
}
