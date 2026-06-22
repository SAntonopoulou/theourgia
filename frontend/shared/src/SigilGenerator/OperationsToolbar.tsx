/**
 * OperationsToolbar — non-destructive transforms below the preview.
 *
 * Per H05 §S3 + §S2.1: operations layer over the rendered SVG via
 * transform; they do not mutate the sigil's source parameters.
 * Recolor uses a curated 7-colour palette from `copy.ts`.
 */

import { type CSSProperties } from "react";

import {
  OPERATION_MIRROR,
  OPERATION_RENAME,
  OPERATION_RESIZE,
  OPERATION_ROTATE,
  OPERATION_SIMPLIFY,
  OPERATIONS_EYEBROW,
  RECOLOR_SWATCHES,
} from "./copy.js";

const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  overflowX: "auto",
  marginTop: 16,
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  flex: "none",
  paddingRight: 4,
};

const PILL_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 11px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-sm)",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-soft)",
  flex: "none",
  background: "transparent",
  cursor: "pointer",
};

const PILL_LABEL: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "5px 10px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-sm)",
  flex: "none",
};

const HINT: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
};

export interface OperationsToolbarProps {
  scale: number;
  rotate: number;
  color: string;
  onScale: (next: number) => void;
  onRotate: (next: number) => void;
  onColor: (next: string) => void;
  onMirror: () => void;
  onRename?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function OperationsToolbar({
  scale,
  rotate,
  color,
  onScale,
  onRotate,
  onColor,
  onMirror,
  onRename,
  className,
  style,
}: OperationsToolbarProps) {
  return (
    <div
      data-component="sigil-operations-toolbar"
      className={`scroll ${className ?? ""}`}
      style={{ ...ROW_STYLE, ...style }}
    >
      <span style={EYEBROW_STYLE}>{OPERATIONS_EYEBROW}</span>

      <button
        type="button"
        data-op="rename"
        onClick={onRename}
        style={PILL_BUTTON}
      >
        <svg
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 19l2.5-.6L19 7a2 2 0 0 0-3-3L4.6 15.5 4 18z" />
        </svg>
        {OPERATION_RENAME}
      </button>

      <div
        role="group"
        aria-label="Recolor"
        data-op="recolor"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-sm)",
          flex: "none",
        }}
      >
        {RECOLOR_SWATCHES.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Colour ${i + 1}`}
            data-swatch-index={i}
            onClick={() => onColor(c)}
            style={{
              width: 17,
              height: 17,
              borderRadius: "50%",
              background: c,
              borderWidth: color === c ? 2 : 1,
              borderStyle: "solid",
              borderColor: color === c ? "var(--accent)" : "var(--line-2)",
              flex: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>

      <label style={PILL_LABEL} data-op="resize">
        <span style={HINT}>{OPERATION_RESIZE}</span>
        <input
          type="range"
          min={100}
          max={800}
          value={scale}
          onChange={(e) => onScale(Number(e.target.value))}
          style={{ width: 80 }}
        />
      </label>

      <label style={PILL_LABEL} data-op="simplify">
        <span style={HINT}>{OPERATION_SIMPLIFY}</span>
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={20}
          style={{ width: 60 }}
        />
      </label>

      <button
        type="button"
        data-op="mirror"
        onClick={onMirror}
        style={PILL_BUTTON}
      >
        {OPERATION_MIRROR}
      </button>

      <label style={PILL_LABEL} data-op="rotate">
        <span style={HINT}>{OPERATION_ROTATE}</span>
        <input
          type="range"
          min={-180}
          max={180}
          value={rotate}
          onChange={(e) => onRotate(Number(e.target.value))}
          style={{ width: 80 }}
        />
      </label>
    </div>
  );
}
