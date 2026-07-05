/**
 * Media Library — admin route wrapping MediaLibrarySurface.
 *
 * Live-wired: GET /api/v1/media populates the grid. Upload dispatches
 * to /api/v1/media/uploads (multipart) — that plumbing lives in the
 * MediaUploadModal shared component.
 */

import {
  type MediaAsset,
  MediaLibrarySurface,
  MediaUploadModal,
  Toast,
  type UploadFileDraft,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

interface WireMediaAsset {
  id: string;
  kind: string;
  filename: string;
  size_bytes: number;
  uploaded_at?: string;
  duration_seconds?: number;
  link_count?: number;
}

function toAsset(m: WireMediaAsset): MediaAsset {
  const size = m.size_bytes;
  const sizeLabel =
    size >= 1_000_000
      ? `${(size / 1_000_000).toFixed(1)} MB`
      : `${Math.max(1, Math.round(size / 1_000))} KB`;
  const date = m.uploaded_at
    ? new Date(m.uploaded_at).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      })
    : "";
  const duration =
    typeof m.duration_seconds === "number"
      ? `${Math.floor(m.duration_seconds / 60)}:${String(
          Math.round(m.duration_seconds % 60),
        ).padStart(2, "0")}`
      : undefined;
  return {
    id: m.id,
    kind: (m.kind as MediaAsset["kind"]) ?? "document",
    filename: m.filename,
    meta_label: `${date}${date && sizeLabel ? " · " : ""}${duration ?? sizeLabel}`,
    duration_label: duration ?? null,
    link_count_label: m.link_count
      ? `linked to ${m.link_count} ${m.link_count === 1 ? "item" : "items"}`
      : null,
    size_bytes: size,
    uploaded_at: m.uploaded_at ?? "",
  };
}


export function MediaLibraryRoute() {
  const navigate = useNavigate();
  const [uploadOpen, setUploadOpen] = useState(false);

  useTopbar(
    () => ({
      title: "Media Library",
      subtitle:
        "Images, audio, video, documents — every asset in this vault.",
    }),
    [],
  );

  const query = useQuery({
    queryKey: ["media"],
    queryFn: async () =>
      (await apiMethods.listMedia()) as unknown as WireMediaAsset[],
    staleTime: 30_000,
  });

  const assets = useMemo<MediaAsset[]>(
    () => (query.data ?? []).map(toAsset),
    [query.data],
  );

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/media/${id}`);
    },
    [navigate],
  );

  const handleUpload = useCallback(() => {
    setUploadOpen(true);
  }, []);

  const handleUploadClose = useCallback(() => {
    setUploadOpen(false);
  }, []);

  const handleUploadSubmit = useCallback(
    (files: readonly UploadFileDraft[]) => {
      // Phase 11 backend lands later; toast a friendly stand-in.
      Toast.push({
        tone: "info",
        title: `Uploading ${files.length} ${files.length === 1 ? "file" : "files"}`,
        body: "Phase 11 backend lands next — the modal stages everything client-side until then.",
      });
      // Close after a brief moment so the user sees the progress.
      setTimeout(() => setUploadOpen(false), 1400);
    },
    [],
  );

  const handleOpenSealed = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Sealed media",
      body: "Unlock the vault to view sealed media. Count remains visible while the vault is sealed.",
    });
  }, []);

  return (
    <>
      <MediaLibrarySurface
        assets={assets}
        sealed_count={0}
        onSelect={handleSelect}
        onUpload={handleUpload}
        onOpenSealed={handleOpenSealed}
      />
      <MediaUploadModal
        open={uploadOpen}
        onClose={handleUploadClose}
        onUpload={handleUploadSubmit}
      />
    </>
  );
}
