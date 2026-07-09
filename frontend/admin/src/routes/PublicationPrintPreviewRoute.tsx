/**
 * Publication Print Preview — admin route at
 * ``/publications/:id/print-preview``.
 *
 * Wraps the shared PrintPreviewSurface with a live "Export print PDF"
 * button. The surface's typography rail is config-only; the substance
 * is on the export path, which POSTs to
 * ``/api/v1/publications/{id}/book-pdf`` and streams a print-quality
 * PDF back for the browser to download.
 *
 * Tier plan #19 · print-quality book typography (b108-2ia).
 */

import {
  type PrintPreviewRecord,
  PrintPreviewSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { apiClient, apiMethods } from "../data/api.js";

interface WireChapter {
  id: string;
  title: string;
  order_index: number;
}

interface WirePublication {
  id: string;
  title: string;
  slug: string;
  kind: string;
  chapters?: WireChapter[];
}

const DEFAULT_RECORD: PrintPreviewRecord = {
  page_size: "us-trade-6x9",
  show_trim_and_bleed: false,
  show_page_numbers: true,
  body_font: "Times",
  heading_scale: "standard",
  drop_caps: true,
  footnote_style: "endnotes",
  substitution_warnings: [],
  total_pages: 0,
  est_export_mb: 0,
};

export function PublicationPrintPreviewRoute() {
  const { id } = useParams<{ id: string }>();
  useTopbar(
    () => ({
      title: "Print preview",
      subtitle: "Book-quality PDF export",
    }),
    [],
  );

  const [publication, setPublication] = useState<WirePublication | null>(null);
  const [record, setRecord] = useState<PrintPreviewRecord>(DEFAULT_RECORD);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiMethods
      .getPublication(id)
      .then((row) => {
        if (cancelled) return;
        const pub = row as unknown as WirePublication;
        setPublication(pub);
        const chapterCount = pub.chapters?.length ?? 0;
        // Rough estimate — the real page count comes back with the
        // PDF. We surface a placeholder in the meantime.
        setRecord((prev) => ({
          ...prev,
          total_pages: Math.max(3, chapterCount * 6 + 3),
        }));
      })
      .catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't load publication",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = useCallback(
    (patch: Partial<PrintPreviewRecord>) => {
      setRecord((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const handleExport = useCallback(async () => {
    if (!id || !publication) return;
    setExporting(true);
    try {
      const blob = await apiClient.requestBlob(
        `/api/v1/publications/${encodeURIComponent(id)}/book-pdf`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${publication.slug || "publication"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      Toast.push({
        tone: "success",
        title: "Print PDF ready",
        body: "Downloaded to your device.",
      });
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Export failed",
        body: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setExporting(false);
    }
  }, [id, publication]);

  const spread = useMemo(
    () => ({
      verso: {
        page_number: 2,
        body_html: publication?.title
          ? `<p><i>${publication.title}</i></p>`
          : "",
      },
      recto: {
        page_number: 3,
        chapter_eyebrow: "Chapter 1",
        chapter_title:
          publication?.chapters?.[0]?.title ?? "Front matter",
        drop_cap: record.drop_caps,
        body_html:
          "<p>The preview here is representative. Export the PDF for the print-ready spread.</p>",
      },
    }),
    [publication, record.drop_caps],
  );

  const spreadLabel = useMemo(() => {
    const total = record.total_pages || 3;
    return `Pages 2–3 of ${total} · ${
      record.page_size === "us-trade-6x9" ? "US Trade 6×9" : record.page_size
    }`;
  }, [record.page_size, record.total_pages]);

  if (!publication) {
    return (
      <div
        style={{
          padding: "40px 24px",
          fontFamily: "var(--font-ui)",
          color: "var(--ink-mute)",
        }}
      >
        Loading print preview…
      </div>
    );
  }

  return (
    <PrintPreviewSurface
      publication_title={publication.title}
      publication={record}
      spread={spread}
      spread_label={spreadLabel}
      onChange={handleChange}
      onExport={exporting ? undefined : handleExport}
    />
  );
}
