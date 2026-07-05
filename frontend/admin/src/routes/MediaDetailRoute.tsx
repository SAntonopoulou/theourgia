/**
 * Media Detail — admin route.
 *
 * Live-wired: GET /media/{id} on mount, PATCH /media/{id} on every
 * change to alt-text / caption / seal / tags. Insert-into-entry
 * stays surface-scoped until the Tiptap picker exposes an insert
 * path from outside the editor.
 */

import {
  type MediaDetailRecord,
  MediaDetailSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";


interface WireMediaAsset {
  id: string;
  kind: string;
  filename: string;
  size_bytes: number;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  page_count?: number | null;
  frame_rate?: number | null;
  alt_text?: string | null;
  caption?: string | null;
  tags?: string[];
  exif_policy?: string;
  sealed?: boolean;
}

function sizeLabel(size: number, kind: string, content_type: string | null): string {
  const bytes =
    size >= 1_000_000
      ? `${(size / 1_000_000).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1_000))} KB`;
  const type = content_type ?? kind;
  return `${type} · ${bytes}`;
}

function dimensionsLabel(w: WireMediaAsset): string {
  if (w.width && w.height) {
    const parts = [`${w.width}×${w.height}`];
    if (w.frame_rate) parts.push(`${w.frame_rate} fps`);
    return parts.join(" · ");
  }
  if (w.duration_seconds) {
    return `${Math.floor(w.duration_seconds / 60)}:${String(
      Math.round(w.duration_seconds % 60),
    ).padStart(2, "0")}`;
  }
  if (w.page_count) return `${w.page_count} pages`;
  return "—";
}

function toRecord(w: WireMediaAsset): MediaDetailRecord {
  const secs = w.duration_seconds ?? null;
  return {
    id: w.id,
    kind: (w.kind as MediaDetailRecord["kind"]) ?? "document",
    filename: w.filename,
    dimensions_label: dimensionsLabel(w),
    type_size_label: sizeLabel(w.size_bytes, w.kind, w.content_type ?? null),
    duration_label: secs
      ? `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}`
      : undefined,
    exif_policy: (w.exif_policy as MediaDetailRecord["exif_policy"]) ?? "stripped",
    exif_label:
      w.exif_policy === "retained" ? "EXIF retained" : "EXIF stripped",
    alt_text: w.alt_text ?? "",
    caption: w.caption ?? "",
    tags: [...(w.tags ?? [])],
    sealed: w.sealed ?? false,
    links: [],
  };
}

export function MediaDetailRoute() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<MediaDetailRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    apiMethods
      .getMedia(params.id)
      .then((row) => {
        if (cancelled) return;
        setRecord(toRecord(row as unknown as WireMediaAsset));
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Failed to load media asset",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useTopbar(
    () => ({
      title: record?.filename ?? "Media asset",
      subtitle: record
        ? `${record.dimensions_label} · ${record.type_size_label}`
        : loadError ?? "loading…",
    }),
    [record?.filename, record?.dimensions_label, record?.type_size_label, loadError],
  );

  const patchAsset = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!params.id) return;
      try {
        const updated = await apiMethods.updateMedia(params.id, patch);
        setRecord(toRecord(updated as unknown as WireMediaAsset));
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save",
          body: err instanceof Error ? err.message : "Unexpected error.",
        });
      }
    },
    [params.id],
  );

  const handleBack = useCallback(() => {
    navigate("/media");
  }, [navigate]);

  const handleInsert = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Insert into entry",
      body: "The Tiptap picker doesn't yet accept out-of-band inserts. Open an entry and use the picker there.",
    });
  }, []);

  const handleAltText = useCallback(
    (alt_text: string) => {
      setRecord((r) => (r ? { ...r, alt_text } : r));
      void patchAsset({ alt_text });
    },
    [patchAsset],
  );

  const handleCaption = useCallback(
    (caption: string) => {
      setRecord((r) => (r ? { ...r, caption } : r));
      void patchAsset({ caption });
    },
    [patchAsset],
  );

  const handleToggleSeal = useCallback(
    (next: boolean) => {
      setRecord((r) => (r ? { ...r, sealed: next } : r));
      void patchAsset({ sealed: next });
    },
    [patchAsset],
  );

  const handleAddTag = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Add tag",
      body: "Tag editing shipped for entries but not yet as a modal on media detail. Coming next.",
    });
  }, []);

  const handleRemoveTag = useCallback(
    (t: string) => {
      if (!record) return;
      const next = record.tags.filter((x) => x !== t);
      setRecord({ ...record, tags: next });
      void patchAsset({ tags: next });
    },
    [record, patchAsset],
  );

  const handleAddLink = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Link",
      body: "Entity / Library / Chart picker for media asset links is on the roadmap.",
    });
  }, []);

  const handleRemoveLink = useCallback(
    (id: string) => {
      setRecord((r) =>
        r ? { ...r, links: r.links.filter((x) => x.id !== id) } : r,
      );
    },
    [],
  );

  if (!record) {
    return (
      <div
        style={{
          padding: "40px 24px",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        {loadError ?? "Loading media…"}
      </div>
    );
  }

  return (
    <MediaDetailSurface
      record={record}
      onBack={handleBack}
      onInsert={handleInsert}
      onAltTextChange={handleAltText}
      onCaptionChange={handleCaption}
      onToggleSeal={handleToggleSeal}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
      onAddLink={handleAddLink}
      onRemoveLink={handleRemoveLink}
    />
  );
}
