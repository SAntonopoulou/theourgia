/**
 * Media Detail — admin route wrapping the shared MediaDetailSurface
 * (H07 §S3 surface 15).
 *
 * Phase 11 backend is unbuilt — the route holds a fixture record
 * keyed off the URL `:id` param. The Insert CTA Toasts until the
 * Tiptap editor handoff lands in B108-3.
 */

import {
  type MediaDetailRecord,
  MediaDetailSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const FIXTURE_RECORDS: Record<string, MediaDetailRecord> = {
  "m-altar-dark-moon": {
    id: "m-altar-dark-moon",
    kind: "image",
    filename: "altar-dark-moon.jpg",
    dimensions_label: "2400×1800",
    type_size_label: "image/jpeg · 2.4 MB",
    exif_policy: "retained",
    exif_label: "EXIF retained · 15 Jun 22:41",
    alt_text:
      "A small altar lit by a single oil lamp at the dark of the moon.",
    caption: "The Deipnon offering, before the bell.",
    tags: ["altar", "dark moon"],
    sealed: false,
    links: [
      { id: "l-deipnon", glyph: "✶", label: "Deipnon working" },
      { id: "l-hekate", glyph: "☽", label: "Hekate" },
    ],
  },
  "m-brimo-sounding": {
    id: "m-brimo-sounding",
    kind: "audio",
    filename: "brimo-sounding.m4a",
    dimensions_label: "44.1 kHz · mono",
    type_size_label: "audio/m4a · 500 KB",
    duration_label: "0:42",
    alt_text: "",
    caption: "A barbarous-name working, slowed.",
    tags: ["voce"],
    sealed: false,
    links: [{ id: "l-voce", glyph: "✶", label: "Brimo voce" }],
  },
  "m-banishing-rite": {
    id: "m-banishing-rite",
    kind: "video",
    filename: "banishing-rite.mp4",
    dimensions_label: "1920×1080 · 24 fps",
    type_size_label: "video/mp4 · 12 MB",
    duration_label: "4:18",
    alt_text: "",
    caption: "Banishing rite, May Day.",
    tags: ["rite"],
    sealed: false,
    links: [{ id: "l-rite", glyph: "✶", label: "May Day working" }],
  },
  "m-oracle-transcript": {
    id: "m-oracle-transcript",
    kind: "document",
    filename: "oracle-transcript.pdf",
    dimensions_label: "12 pages",
    type_size_label: "application/pdf · 220 KB",
    alt_text: "",
    caption: "",
    tags: ["oracle"],
    sealed: false,
    links: [],
  },
};

const DEFAULT_RECORD = FIXTURE_RECORDS["m-altar-dark-moon"]!;

export function MediaDetailRoute() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const initial = useMemo<MediaDetailRecord>(() => {
    const id = params.id;
    return (id && FIXTURE_RECORDS[id]) || DEFAULT_RECORD;
  }, [params.id]);

  const [record, setRecord] = useState<MediaDetailRecord>(initial);

  useTopbar(
    () => ({
      title: record.filename,
      subtitle: `${record.dimensions_label} · ${record.type_size_label}`,
    }),
    [record.filename, record.dimensions_label, record.type_size_label],
  );

  const handleBack = useCallback(() => {
    navigate("/media");
  }, [navigate]);

  const handleInsert = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Insert into entry",
      body: "Tiptap editor handoff lands in B108-3. The asset reference is staged.",
    });
  }, []);

  const handleAltText = useCallback((alt_text: string) => {
    setRecord((r) => ({ ...r, alt_text }));
  }, []);

  const handleCaption = useCallback((caption: string) => {
    setRecord((r) => ({ ...r, caption }));
  }, []);

  const handleToggleSeal = useCallback((next: boolean) => {
    setRecord((r) => ({ ...r, sealed: next }));
    Toast.push({
      tone: "info",
      title: next ? "Will seal on save" : "Will unseal on save",
      body: "Seal state is staged until you save. Vault must be unlocked.",
    });
  }, []);

  const handleAddTag = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Add tag",
      body: "Tag editor lands with the Phase 11 backend.",
    });
  }, []);

  const handleRemoveTag = useCallback((t: string) => {
    setRecord((r) => ({ ...r, tags: r.tags.filter((x) => x !== t) }));
  }, []);

  const handleAddLink = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Link",
      body: "Entity / Library / Chart picker reuses the Tiptap pickers; ships in B108-3.",
    });
  }, []);

  const handleRemoveLink = useCallback((id: string) => {
    setRecord((r) => ({
      ...r,
      links: r.links.filter((x) => x.id !== id),
    }));
  }, []);

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
