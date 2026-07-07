/**
 * PrintPreviewSurface — H07 §S3 surface 13.
 *
 * Book-grade print preview. Two-page spread renderer with a
 * typography rail and an export-PDF footer.
 *
 * Honesty rules (H07 §S3 #13):
 *   • Page-size picker + typography rail are config-only.
 *   • Font-substitution warnings render `--warn-soft` —
 *     OBSERVATIONAL, not gating. The export still succeeds.
 *   • Export-PDF button triggers a job (long-running 30-60s);
 *     the route handles the actual progress UI.
 *   • The spread preview uses fixed light-mode page colours
 *     (#FBF7EC paper, ink) so the preview reflects the final
 *     printed work regardless of the surrounding theme.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
} from "react";

// ── Types ──────────────────────────────────────────────────────────

export type PrintPageSize =
  | "us-letter"
  | "us-trade-6x9"
  | "uk-royal"
  | "a5"
  | "a4";

export type PrintHeadingScale = "compact" | "standard" | "generous";

export type PrintFootnoteStyle = "inline" | "margin" | "endnotes";

export interface PrintSpreadPage {
  /** 1-indexed page number for the running header / footer. */
  page_number: number;
  /** Tiptap-rendered HTML for the page body. Optional — the
   *  consumer may render via children for tests. */
  body_html?: string;
  /** When this page begins a chapter, the chapter eyebrow + title
   *  surface centred at the top. */
  chapter_eyebrow?: string | null;
  chapter_title?: string | null;
  /** When true, the first paragraph gets a drop cap. */
  drop_cap?: boolean;
}

export interface PrintPreviewRecord {
  page_size: PrintPageSize;
  show_trim_and_bleed: boolean;
  show_page_numbers: boolean;
  body_font: string;
  heading_scale: PrintHeadingScale;
  drop_caps: boolean;
  footnote_style: PrintFootnoteStyle;
  /** Glyph substitution warnings (observational). When non-empty,
   *  surfaces a `--warn-soft` block in the rail. */
  substitution_warnings: string[];
  /** Total page count of the book — quiet stat in the footer. */
  total_pages: number;
  /** Estimated export size in MB — quiet stat in the footer. */
  est_export_mb: number;
}

export interface PrintPreviewSurfaceProps {
  publication_title: string;
  publication: PrintPreviewRecord;
  /** The two pages of the current spread. `null` skips that side
   *  (first / last spreads are single-sided). */
  spread: { verso: PrintSpreadPage | null; recto: PrintSpreadPage | null };
  /** Current page-range label, e.g. "Pages 24–25 of 188 · US Trade 6×9" */
  spread_label: string;
  onChange?: (patch: Partial<PrintPreviewRecord>) => void;
  onExport?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ── Constants ─────────────────────────────────────────────────────

const PAGE_SIZE_LABELS: Record<PrintPageSize, string> = {
  "us-letter": "US Letter",
  "us-trade-6x9": "US Trade 6×9",
  "uk-royal": "UK Royal",
  a5: "A5",
  a4: "A4",
};

const PAGE_SIZE_ORDER: PrintPageSize[] = [
  "us-letter",
  "us-trade-6x9",
  "uk-royal",
  "a5",
  "a4",
];

const BODY_FONTS = [
  "Cardo",
  "Frank Ruhl Libre",
  "GFS Didot",
  "Cinzel",
  "Custom (uploaded)…",
];

const HEADING_SCALES: PrintHeadingScale[] = [
  "compact",
  "standard",
  "generous",
];

const HEADING_SCALE_LABELS: Record<PrintHeadingScale, string> = {
  compact: "Compact",
  standard: "Standard",
  generous: "Generous",
};

const FOOTNOTE_STYLES: PrintFootnoteStyle[] = [
  "inline",
  "margin",
  "endnotes",
];

const FOOTNOTE_LABELS: Record<PrintFootnoteStyle, string> = {
  inline: "Inline",
  margin: "Margin",
  endnotes: "Endnotes",
};

// ── Styles ────────────────────────────────────────────────────────

const TOOLBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  overflowX: "auto",
  padding: "11px 22px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const PANES: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
  flex: 1,
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: 36,
  background: "var(--bg-sunk)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 20,
};

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 280px",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 18px 30px",
  overflowY: "auto",
};

const FOOTER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 22px",
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  background: "var(--bg)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 9,
};

// ── Icons ─────────────────────────────────────────────────────────

function CheckIcon(): ReactElement {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function WarnIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}

function ChevronDown(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function DownloadIcon(): ReactElement {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
    </svg>
  );
}

// ── Page renderer ─────────────────────────────────────────────────

function PageView({
  page,
  bodyFont,
  dropCaps,
}: {
  page: PrintSpreadPage;
  bodyFont: string;
  dropCaps: boolean;
}): ReactElement {
  return (
    <div
      data-page-number={page.page_number}
      style={{
        width: 300,
        aspectRatio: "6/9",
        background: "#FBF7EC",
        color: "#2A2316",
        padding: "46px 38px 38px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {page.chapter_eyebrow && page.chapter_title ? (
        <div
          style={{
            textAlign: "center",
            margin: "28px 0 26px",
          }}
        >
          <div
            style={{
              fontFamily: "'Inria Sans', sans-serif",
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8a7d63",
              marginBottom: 10,
            }}
          >
            {page.chapter_eyebrow}
          </div>
          <div
            style={{
              fontFamily: `'${bodyFont}', serif`,
              fontSize: 22,
              color: "#2A2316",
            }}
          >
            {page.chapter_title}
          </div>
        </div>
      ) : null}
      <div
        data-page-body
        style={{
          fontFamily: `'${bodyFont}', serif`,
          fontSize: 11.5,
          lineHeight: 1.7,
          color: "#3a3326",
          flex: 1,
        }}
      >
        {page.body_html ? (
          dropCaps && page.drop_cap ? (
            <div
              dangerouslySetInnerHTML={{
                __html: page.body_html
                  .replace(
                    /(<p[^>]*>)([A-ZΑ-Ωא-תـ])/u,
                    `$1<span style="float:left;font-family:'${bodyFont}',serif;font-size:34px;line-height:.8;padding:3px 6px 0 0;color:#9A6E22">$2</span>`,
                  ),
              }}
            />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: page.body_html }} />
          )
        ) : null}
      </div>
      <div
        style={{
          fontFamily: "'Inria Sans', sans-serif",
          fontSize: 9,
          color: "#8a7d63",
          textAlign: "center",
          marginTop: 14,
        }}
      >
        {page.page_number}
      </div>
    </div>
  );
}

// ── Surface ───────────────────────────────────────────────────────

export function PrintPreviewSurface({
  publication_title,
  publication,
  spread,
  spread_label,
  onChange,
  onExport,
  className,
  style,
}: PrintPreviewSurfaceProps) {
  const patch = useCallback(
    (p: Partial<PrintPreviewRecord>) => onChange?.(p),
    [onChange],
  );

  return (
    <div
      data-component="print-preview-surface"
      data-publication-title={publication_title}
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      {/* Toolbar */}
      <div className="scroll" style={TOOLBAR_STYLE}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            Page size
          </span>
          <div
            role="group"
            aria-label="Page size"
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 8,
              background: "var(--bg-2)",
            }}
          >
            {PAGE_SIZE_ORDER.map((s) => {
              const on = publication.page_size === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  data-page-size={s}
                  onClick={() => patch({ page_size: s })}
                  style={{
                    padding: "5px 11px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: on ? "var(--ink)" : "var(--ink-mute)",
                    background: on ? "var(--accent-soft)" : "transparent",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--line-2)" : "transparent",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {PAGE_SIZE_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flex: "none",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <span
            data-toggle="trim-bleed"
            data-on={publication.show_trim_and_bleed}
            onClick={() =>
              patch({
                show_trim_and_bleed: !publication.show_trim_and_bleed,
              })
            }
            style={{
              width: 15,
              height: 15,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: publication.show_trim_and_bleed
                ? "var(--accent)"
                : "var(--line-2)",
              borderRadius: 3,
              background: publication.show_trim_and_bleed
                ? "var(--accent-soft)"
                : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {publication.show_trim_and_bleed ? <CheckIcon /> : null}
          </span>
          Trim &amp; bleed
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flex: "none",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          <span
            data-toggle="page-numbers"
            data-on={publication.show_page_numbers}
            onClick={() =>
              patch({
                show_page_numbers: !publication.show_page_numbers,
              })
            }
            style={{
              width: 15,
              height: 15,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: publication.show_page_numbers
                ? "var(--accent)"
                : "var(--line-2)",
              borderRadius: 3,
              background: publication.show_page_numbers
                ? "var(--accent-soft)"
                : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {publication.show_page_numbers ? <CheckIcon /> : null}
          </span>
          Page numbers
        </label>
      </div>

      {/* Spread + rail */}
      <div style={PANES}>
        <div className="scroll" style={MAIN_STYLE}>
          <div
            data-spread-label
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            {spread_label}
          </div>
          <div
            className="pp-spread"
            data-pp-spread
            style={{
              display: "flex",
              gap: 3,
              boxShadow: "0 18px 50px rgba(0,0,0,.5)",
            }}
          >
            {spread.verso ? (
              <PageView
                page={spread.verso}
                bodyFont={publication.body_font}
                dropCaps={publication.drop_caps}
              />
            ) : null}
            {spread.recto ? (
              <PageView
                page={spread.recto}
                bodyFont={publication.body_font}
                dropCaps={publication.drop_caps}
              />
            ) : null}
          </div>
        </div>

        <aside className="scroll" aria-label="Typography" style={RAIL_STYLE}>
          {/* Body font */}
          <div style={EYEBROW}>Body font</div>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <select
              value={publication.body_font}
              onChange={(e) => patch({ body_font: e.target.value })}
              data-body-font
              aria-label="Body font"
              style={{
                width: "100%",
                padding: "9px 11px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                appearance: "none",
              }}
            >
              {BODY_FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--ink-mute)",
              }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </div>

          {/* Heading scale */}
          <div style={EYEBROW}>Heading scale</div>
          <div
            role="group"
            aria-label="Heading scale"
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 8,
              background: "var(--bg)",
              marginBottom: 18,
            }}
          >
            {HEADING_SCALES.map((s) => {
              const on = publication.heading_scale === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  data-heading-scale={s}
                  onClick={() => patch({ heading_scale: s })}
                  style={{
                    flex: 1,
                    padding: "5px 11px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: on ? "var(--ink)" : "var(--ink-mute)",
                    background: on ? "var(--accent-soft)" : "transparent",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--line-2)" : "transparent",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {HEADING_SCALE_LABELS[s]}
                </button>
              );
            })}
          </div>

          {/* Drop caps */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              cursor: "pointer",
            }}
          >
            <button
              type="button"
              role="switch"
              aria-checked={publication.drop_caps}
              data-drop-caps
              onClick={() => patch({ drop_caps: !publication.drop_caps })}
              style={{
                width: 30,
                height: 17,
                borderRadius: 9,
                background: publication.drop_caps
                  ? "var(--accent-soft)"
                  : "var(--bg-3)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: publication.drop_caps
                  ? "var(--accent)"
                  : "var(--line-2)",
                position: "relative",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 1,
                  left: publication.drop_caps ? 14 : 1,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: publication.drop_caps
                    ? "var(--accent)"
                    : "var(--ink-mute)",
                }}
              />
            </button>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              Drop caps
            </span>
          </label>

          {/* Footnote style */}
          <div style={EYEBROW}>Footnote style</div>
          <div
            role="group"
            aria-label="Footnote style"
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 8,
              background: "var(--bg)",
              marginBottom: 20,
            }}
          >
            {FOOTNOTE_STYLES.map((f) => {
              const on = publication.footnote_style === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  data-footnote-style={f}
                  onClick={() => patch({ footnote_style: f })}
                  style={{
                    flex: 1,
                    padding: "5px 11px",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: on ? "var(--ink)" : "var(--ink-mute)",
                    background: on ? "var(--accent-soft)" : "transparent",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: on ? "var(--line-2)" : "transparent",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {FOOTNOTE_LABELS[f]}
                </button>
              );
            })}
          </div>

          {/* Substitution warnings */}
          {publication.substitution_warnings.length > 0 ? (
            <div
              data-substitution-warning
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "11px 13px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--warn-border)",
                borderRadius: "var(--r-md)",
                background: "var(--warn-soft)",
              }}
            >
              <span
                style={{
                  color: "var(--warn)",
                  flex: "none",
                  marginTop: 1,
                }}
                aria-hidden="true"
              >
                <WarnIcon />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-soft)",
                  lineHeight: 1.45,
                }}
              >
                {publication.substitution_warnings.length === 1
                  ? "One glyph "
                  : `${publication.substitution_warnings.length} glyphs `}
                in your manuscript (
                {publication.substitution_warnings.join(" · ")}) aren't
                in {publication.body_font} — they'll render in Noto
                Sans Symbols. The export still succeeds.
              </span>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Footer */}
      <footer data-pp-footer style={FOOTER_STYLE}>
        <span
          data-pp-stat
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          {publication.total_pages} pages · est.{" "}
          {publication.est_export_mb.toFixed(1)} MB
        </span>
        <button
          type="button"
          data-action="export-pdf"
          onClick={onExport}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
        >
          <DownloadIcon />
          Export print PDF
        </button>
      </footer>
    </div>
  );
}
