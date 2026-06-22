/**
 * LayerPanel — left-side z-ordered layer list + mirror-to-other-face.
 *
 * Six layer kinds in fixed order (background → image as z-order
 * bottom→top). Rail renders them REVERSED so the practitioner sees
 * "z-order ↑" with the topmost-drawn layer at the top of the list.
 */

import { type CSSProperties } from "react";

import {
  layersEyebrow,
  mirrorLabel,
  TALISMAN_LAYERS,
  type TalismanFace,
  type TalismanLayerKind,
  Z_ORDER_HINT,
} from "./copy.js";

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 280px",
  minWidth: 0,
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 16px",
  overflowY: "auto",
};

const ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 11px",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
  cursor: "pointer",
};

const ROW_ON: CSSProperties = {
  ...ROW_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

function LayerIcon({ kind }: { kind: TalismanLayerKind }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "background":
      return (
        <svg {...common}>
          <rect x={4} y={4} width={16} height={16} rx={2} />
        </svg>
      );
    case "border":
      return (
        <svg {...common}>
          <circle cx={12} cy={12} r={9} />
          <circle cx={12} cy={12} r={6} />
        </svg>
      );
    case "square":
      return (
        <svg {...common}>
          <rect x={5} y={5} width={14} height={14} rx={1} />
          <path d="M10 5v14M14 5v14M5 10h14M5 14h14" />
        </svg>
      );
    case "sigil":
      return (
        <svg {...common}>
          <circle cx={12} cy={12} r={8} />
          <path d="M8 14l4-7 4 7" />
        </svg>
      );
    case "inscriptions":
      return (
        <svg {...common}>
          <path d="M5 7h14M7 7v10M17 7v10M5 17h6" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <rect x={4} y={5} width={16} height={14} rx={2} />
          <circle cx={9} cy={10} r={1.5} />
          <path d="M5 17l4-4 3 3 3-4 4 5" />
        </svg>
      );
  }
}

export interface LayerPanelProps {
  face: TalismanFace;
  value: TalismanLayerKind;
  onChange: (next: TalismanLayerKind) => void;
  onMirror: () => void;
  className?: string;
  style?: CSSProperties;
}

export function LayerPanel({
  face,
  value,
  onChange,
  onMirror,
  className,
  style,
}: LayerPanelProps) {
  // Reverse so topmost-drawn renders at the top of the list.
  const reversed = [...TALISMAN_LAYERS].reverse();
  return (
    <aside
      data-component="talisman-layer-panel"
      className={`scroll tl-side ${className ?? ""}`}
      style={{ ...RAIL_STYLE, ...style }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {layersEyebrow(face)}
        </div>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-mute)",
          }}
        >
          {Z_ORDER_HINT}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {reversed.map((layer) => {
          const on = value === layer.key;
          return (
            <button
              key={layer.key}
              type="button"
              data-layer={layer.key}
              aria-pressed={on}
              onClick={() => onChange(layer.key)}
              style={on ? ROW_ON : ROW_BASE}
            >
              <span
                style={{
                  display: "flex",
                  color: on ? "var(--accent)" : "var(--ink-mute)",
                  flex: "none",
                }}
              >
                <LayerIcon kind={layer.key} />
              </span>
              <span
                style={{
                  flex: 1,
                  textAlign: "left",
                  minWidth: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {layer.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10.5,
                  color: "var(--ink-mute)",
                }}
              >
                {layer.summary}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          type="button"
          data-action="mirror"
          onClick={onMirror}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: 9,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
          </svg>
          {mirrorLabel(face)}
        </button>
      </div>
    </aside>
  );
}
