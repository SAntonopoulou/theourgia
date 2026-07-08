/**
 * PdfViewer — inline PDF rendering for publications.
 *
 * Uses pdf.js's canvas renderer. Loads a single page at a time to keep
 * memory bounded on long books; paginates via prev/next controls. When
 * `download_url` is supplied, renders a fallback "Open in a new tab"
 * link so viewers who prefer the OS viewer still have one click.
 *
 * ARIA: uses role="region" with a live-polite page indicator so
 * screen readers announce page changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

// Vite `?url` import returns the built asset URL for the worker.
// Ambient typing lives in `../vite-env.d.ts`.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfViewerProps {
  /** URL to a PDF byte stream. Must be same-origin OR CORS-allowed. */
  url: string;
  /** Watermark string rendered under the page (e.g. buyer email). */
  watermark?: string | null;
  /** Optional download URL for "Open in tab". */
  downloadUrl?: string | null;
  /** Optional maximum viewport width. Defaults to 900px. */
  maxWidth?: number;
}

export function PdfViewer({
  url,
  watermark,
  downloadUrl,
  maxWidth = 900,
}: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const loaded = await pdfjsLib.getDocument({ url }).promise;
        if (cancelled) return;
        setDoc(loaded);
        setTotal(loaded.numPages);
        setPage(1);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const renderPage = useCallback(
    async (pageNo: number) => {
      if (!doc || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const p = await doc.getPage(pageNo);
      const rawViewport = p.getViewport({ scale: 1 });
      const scale = Math.min(maxWidth / rawViewport.width, 2);
      const viewport = p.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
      canvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;
      await p.render({ canvasContext: ctx, viewport, canvas }).promise;
    },
    [doc, maxWidth],
  );

  useEffect(() => {
    void renderPage(page);
  }, [page, renderPage]);

  const canPrev = page > 1;
  const canNext = page < total;

  return (
    <div
      role="region"
      aria-label="PDF reader"
      data-block="pdf-viewer"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-3)",
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-soft)",
        }}
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
          aria-label="Previous page"
          style={buttonStyle(!canPrev)}
        >
          ‹
        </button>
        <span aria-live="polite">
          {loading ? "Loading…" : total ? `Page ${page} of ${total}` : "—"}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={!canNext}
          aria-label="Next page"
          style={buttonStyle(!canNext)}
        >
          ›
        </button>
        {downloadUrl && (
          <a
            href={downloadUrl}
            rel="noopener"
            target="_blank"
            style={{
              marginLeft: "auto",
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            Open PDF in a new tab ↗
          </a>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 18,
          background: "var(--bg)",
          position: "relative",
        }}
      >
        {error ? (
          <div
            role="alert"
            style={{
              padding: "40px 20px",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--danger, var(--ink))",
            }}
          >
            Could not load: {error}
          </div>
        ) : (
          <canvas ref={canvasRef} aria-label={`PDF page ${page}`} />
        )}
        {watermark && (
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              color: "var(--ink-mute)",
              opacity: 0.65,
              pointerEvents: "none",
            }}
          >
            {watermark}
          </span>
        )}
      </div>
    </div>
  );
}

function buttonStyle(disabled: boolean) {
  return {
    padding: "4px 10px",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-sm)",
    background: disabled ? "var(--bg-2)" : "var(--bg)",
    color: disabled ? "var(--ink-mute)" : "var(--ink)",
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    minWidth: 32,
  } as const;
}
