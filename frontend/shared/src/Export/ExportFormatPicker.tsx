/**
 * ExportFormatPicker — 2×2 grid of export-format tiles.
 *
 * Per `Theourgia Export.dc.html`. Each tile shows a colored glyph,
 * the format label, and a short editorial note ("Print-ready",
 * "Plain + portable", "Self-contained", "E-reader"). The selected
 * tile is outlined in `--accent`.
 *
 * Format meta (label / glyph / note / icon color) is exported as
 * `EXPORT_FORMAT_META` so surfaces can compose the same set in
 * other contexts (e.g. the bound-volume mode that drops Markdown +
 * HTML, leaving only PDF + EPUB).
 */

import { type CSSProperties, type ReactNode } from "react";

export type ExportFormat = "pdf" | "markdown" | "html" | "epub";

export interface ExportFormatMeta {
  label: string;
  /** Short editorial caption ("Print-ready", "E-reader"). */
  note: string;
  /** Token-resolved color for the icon. */
  iconColor: string;
  glyph: ReactNode;
}

function PdfGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 13h6M9 17h4M9 9h2" />
    </svg>
  );
}

function MarkdownGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16v10H4z" />
      <path d="M7 15v-6l3 3 3-3v6M18 9v4M16 12l2 2 2-2" />
    </svg>
  );
}

function HtmlGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />
    </svg>
  );
}

function EpubGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 5a2 2 0 0 1 2-2h11v17H7a2 2 0 0 0-2 2z" />
      <path d="M18 3v17M9 8h6" />
    </svg>
  );
}

export const EXPORT_FORMAT_META: Record<ExportFormat, ExportFormatMeta> = {
  pdf: {
    label: "PDF",
    note: "Print-ready",
    iconColor: "var(--c-working)",
    glyph: <PdfGlyph />,
  },
  markdown: {
    label: "Markdown",
    note: "Plain + portable",
    iconColor: "var(--c-divination)",
    glyph: <MarkdownGlyph />,
  },
  html: {
    label: "HTML",
    note: "Self-contained",
    iconColor: "var(--c-entity)",
    glyph: <HtmlGlyph />,
  },
  epub: {
    label: "EPUB",
    note: "E-reader",
    iconColor: "var(--c-synchronicity)",
    glyph: <EpubGlyph />,
  },
};

export const EXPORT_FORMAT_ORDER: ExportFormat[] = [
  "pdf",
  "markdown",
  "html",
  "epub",
];

/** Bound-volume mode drops Markdown + HTML; only PDF + EPUB make
 *  sense for a typeset cover. The labels also shift to "Bound volume"
 *  and "Each entry a chapter" — surfaces can pass these overrides
 *  via the `metaOverrides` prop. */
export const EXPORT_BOUND_FORMATS: ExportFormat[] = ["pdf", "epub"];

export interface ExportFormatPickerProps {
  value: ExportFormat;
  onChange?: (next: ExportFormat) => void;
  /** Restrict the picker to a subset (e.g. `EXPORT_BOUND_FORMATS`). */
  formats?: ExportFormat[];
  /** Override per-format meta (typically just `note` for bound mode). */
  metaOverrides?: Partial<Record<ExportFormat, Partial<ExportFormatMeta>>>;
  className?: string;
  style?: CSSProperties;
}

function tileStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
    padding: "12px 13px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? "var(--accent)" : "var(--line)",
    background: active ? "var(--bg-3)" : "var(--bg-sunk)",
    cursor: "pointer",
    textAlign: "left",
    color: "var(--ink)",
  };
}

export function ExportFormatPicker({
  value,
  onChange,
  formats,
  metaOverrides,
  className,
  style,
}: ExportFormatPickerProps) {
  const order = formats ?? EXPORT_FORMAT_ORDER;
  return (
    <div
      className={className}
      data-component="export-format-picker"
      data-value={value}
      role="radiogroup"
      aria-label="Export format"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 8,
        ...style,
      }}
    >
      {order.map((format) => {
        const baseMeta = EXPORT_FORMAT_META[format];
        const override = metaOverrides?.[format];
        const meta: ExportFormatMeta = {
          label: override?.label ?? baseMeta.label,
          note: override?.note ?? baseMeta.note,
          iconColor: override?.iconColor ?? baseMeta.iconColor,
          glyph: override?.glyph ?? baseMeta.glyph,
        };
        const on = value === format;
        return (
          <button
            key={format}
            type="button"
            role="radio"
            aria-checked={on}
            data-export-format={format}
            data-active={on ? "true" : "false"}
            onClick={() => onChange?.(format)}
            style={tileStyle(on)}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: meta.iconColor,
              }}
            >
              {meta.glyph}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink)",
              }}
            >
              {meta.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
              }}
            >
              {meta.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}
