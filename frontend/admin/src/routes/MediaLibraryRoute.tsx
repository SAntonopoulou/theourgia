/**
 * Media Library — admin route wrapping the shared MediaLibrarySurface
 * (H07 §S3 surface 14, Cluster C entry point).
 *
 * Phase 11 backend is unbuilt by design (per H07 onboarding) — the
 * surface receives a fixture list. "+ Upload" + card-click Toast
 * until the Upload modal + Media Detail surfaces ship next.
 */

import {
  type MediaAsset,
  MediaLibrarySurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const FIXTURE_ASSETS: MediaAsset[] = [
  {
    id: "m-altar-dark-moon",
    kind: "image",
    filename: "altar-dark-moon.jpg",
    meta_label: "15 Jun · 2.4 MB",
    link_count_label: "linked to 2 workings",
    size_bytes: 2_400_000,
    uploaded_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "m-brimo-sounding",
    kind: "audio",
    filename: "brimo-sounding.m4a",
    meta_label: "15 Jun · 0:42",
    duration_label: "0:42",
    link_count_label: "linked voce",
    size_bytes: 500_000,
    uploaded_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "m-crossroads-stone",
    kind: "image",
    filename: "crossroads-stone.jpg",
    meta_label: "08 Jun · 3.1 MB",
    link_count_label: null,
    size_bytes: 3_100_000,
    uploaded_at: "2026-06-08T00:00:00Z",
  },
  {
    id: "m-banishing-rite",
    kind: "video",
    filename: "banishing-rite.mp4",
    meta_label: "01 May · 4:18",
    duration_label: "4:18",
    link_count_label: "linked to 1 working",
    size_bytes: 12_000_000,
    uploaded_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "m-sigil-engraved",
    kind: "image",
    filename: "sigil-engraved.jpg",
    meta_label: "19 Apr · 1.8 MB",
    link_count_label: "linked talisman",
    size_bytes: 1_800_000,
    uploaded_at: "2026-04-19T00:00:00Z",
  },
  {
    id: "m-oracle-transcript",
    kind: "document",
    filename: "oracle-transcript.pdf",
    meta_label: "12 Apr · 220 KB",
    link_count_label: null,
    size_bytes: 220_000,
    uploaded_at: "2026-04-12T00:00:00Z",
  },
  {
    id: "m-deipnon-recording",
    kind: "audio",
    filename: "deipnon-recording.m4a",
    meta_label: "15 Mar · 12:04",
    duration_label: "12:04",
    link_count_label: null,
    size_bytes: 4_200_000,
    uploaded_at: "2026-03-15T00:00:00Z",
  },
];

export function MediaLibraryRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Media Library",
      subtitle:
        "Images, audio, video, documents — every asset in this vault.",
    }),
    [],
  );

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/media/${id}`);
    },
    [navigate],
  );

  const handleUpload = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Upload",
      body: "Upload modal ships next in Cluster C. EXIF-strip default ON; sealed uploads use the B108 vault key.",
    });
  }, []);

  const handleOpenSealed = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Sealed media",
      body: "Unlock the vault to view sealed media. Count remains visible while the vault is sealed.",
    });
  }, []);

  return (
    <MediaLibrarySurface
      assets={FIXTURE_ASSETS}
      sealed_count={3}
      onSelect={handleSelect}
      onUpload={handleUpload}
      onOpenSealed={handleOpenSealed}
    />
  );
}
