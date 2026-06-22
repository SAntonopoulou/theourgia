/**
 * ExportMenu — the dropdown at the top-right of the preview tile.
 *
 * Four formats per the H05 mockup: SVG (primary · ✦ · "vector"),
 * PNG, PDF (print), DXF (CNC / laser). The trigger opens a popover;
 * clicking outside closes it.
 */

import { type CSSProperties } from "react";

import { SIGIL_EXPORT_FORMATS, type SigilExportFormat } from "./copy.js";

const TRIGGER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "7px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const MENU_STYLE: CSSProperties = {
  position: "absolute",
  top: 42,
  right: 0,
  zIndex: 20,
  minWidth: 160,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  boxShadow: "0 14px 34px rgba(0,0,0,.45)",
  padding: 6,
};

const ITEM_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "9px 11px",
  borderRadius: "var(--r-sm)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const HINT_STYLE: CSSProperties = {
  marginLeft: "auto",
  fontSize: 10.5,
  color: "var(--ink-mute)",
};

export interface ExportMenuProps {
  open: boolean;
  onToggle: () => void;
  onSelect?: (format: SigilExportFormat["key"]) => void;
  className?: string;
  style?: CSSProperties;
}

export function ExportMenu({
  open,
  onToggle,
  onSelect,
  className,
  style,
}: ExportMenuProps) {
  return (
    <div
      data-component="sigil-export-menu"
      data-open={open}
      className={className}
      style={{ position: "relative", ...style }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={onToggle}
        style={TRIGGER_STYLE}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
        </svg>
        Export
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
      </button>
      {open ? (
        <div role="menu" style={MENU_STYLE}>
          {SIGIL_EXPORT_FORMATS.map((fmt, i) => {
            const isPrimary = i === 0;
            return (
              <button
                key={fmt.key}
                role="menuitem"
                type="button"
                data-export-format={fmt.key}
                onClick={() => {
                  onSelect?.(fmt.key);
                  onToggle();
                }}
                style={{
                  ...ITEM_STYLE,
                  color: isPrimary ? "var(--ink)" : "var(--ink-soft)",
                }}
              >
                {fmt.glyph ? (
                  <span
                    style={{
                      fontFamily: "var(--font-glyph)",
                      color: "var(--accent)",
                    }}
                  >
                    {fmt.glyph}
                  </span>
                ) : null}
                {fmt.label}
                {fmt.hint ? <span style={HINT_STYLE}>{fmt.hint}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
