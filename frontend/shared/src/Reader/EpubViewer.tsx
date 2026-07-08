/**
 * EpubViewer — inline EPUB rendering for publications.
 *
 * Uses epub.js. Renders a paginated view with prev / next controls +
 * a chapter-position indicator. Watermark, if supplied, floats under
 * the reader (buyer email for a purchased download).
 */

import ePub, { type Book, type Rendition } from "epubjs";
import { useCallback, useEffect, useRef, useState } from "react";

export interface EpubViewerProps {
  /** URL to an EPUB byte stream (must be CORS-allowed). */
  url: string;
  watermark?: string | null;
  downloadUrl?: string | null;
  /** Height of the reading pane. Defaults to 620px. */
  paneHeight?: number;
}

export function EpubViewer({
  url,
  watermark,
  downloadUrl,
  paneHeight = 620,
}: EpubViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("—");

  useEffect(() => {
    if (!containerRef.current) return;
    setReady(false);
    setError(null);
    let cancelled = false;

    try {
      const book = ePub(url);
      bookRef.current = book;
      const rendition = book.renderTo(containerRef.current, {
        width: "100%",
        height: paneHeight,
        spread: "auto",
      });
      renditionRef.current = rendition;

      rendition.on("relocated", (loc: { start: { displayed?: { page: number; total: number } } }) => {
        const d = loc.start.displayed;
        if (d) setProgress(`Page ${d.page} of ${d.total}`);
      });

      void rendition.display().then(() => {
        if (!cancelled) setReady(true);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open EPUB");
    }

    return () => {
      cancelled = true;
      try {
        renditionRef.current?.destroy();
      } catch {
        /* ignore */
      }
      try {
        bookRef.current?.destroy();
      } catch {
        /* ignore */
      }
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [url, paneHeight]);

  const prev = useCallback(() => renditionRef.current?.prev(), []);
  const next = useCallback(() => renditionRef.current?.next(), []);

  return (
    <div
      role="region"
      aria-label="EPUB reader"
      data-block="epub-viewer"
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
        <button type="button" onClick={prev} aria-label="Previous page" style={btnStyle}>
          ‹
        </button>
        <span aria-live="polite">{ready ? progress : "Loading…"}</span>
        <button type="button" onClick={next} aria-label="Next page" style={btnStyle}>
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
            Open EPUB in a new tab ↗
          </a>
        )}
      </div>
      <div style={{ padding: 12, background: "var(--bg)", position: "relative" }}>
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
          <div ref={containerRef} style={{ minHeight: paneHeight }} />
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

const btnStyle = {
  padding: "4px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  cursor: "pointer",
  minWidth: 32,
} as const;
