/**
 * PresetCircleLibrary — modal listing PD preset circles. Loading
 * one produces a mutable copy with no back-link (per H05 §S2.4
 * honesty + the modal sub-text).
 */

import { type CSSProperties, useRef } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  LIBRARY_MODAL_SUB,
  LIBRARY_MODAL_TITLE,
  LIBRARY_PRESETS,
  type CirclePreset,
} from "./copy.js";

const SCRIM_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(520px, 100%)",
  maxHeight: "84vh",
  overflowY: "auto",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg)",
  boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  padding: "24px 26px",
};

export interface PresetCircleLibraryProps {
  open: boolean;
  onClose: () => void;
  presets?: readonly CirclePreset[];
  onLoad?: (preset: CirclePreset) => void;
}

export function PresetCircleLibrary({
  open,
  onClose,
  presets = LIBRARY_PRESETS,
  onLoad,
}: PresetCircleLibraryProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes the modal (b108-2fy a11y sweep).
  useEscapeToClose(open, onClose);
  useFocusTrap(panelRef, open);

  if (!open) return null;
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Preset circles"
      data-component="magical-circle-preset-library"
      style={SCRIM_STYLE}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div className="scroll" style={PANEL_STYLE}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            margin: "0 0 4px",
          }}
        >
          {LIBRARY_MODAL_TITLE}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            margin: "0 0 18px",
          }}
        >
          {LIBRARY_MODAL_SUB}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              data-preset-id={p.id}
              onClick={() => {
                onLoad?.(p);
                onClose();
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  color: "var(--accent)",
                  flex: "none",
                  marginTop: 2,
                }}
              >
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                >
                  <circle cx={12} cy={12} r={9} />
                  <circle cx={12} cy={12} r={4.5} />
                </svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    color: "var(--ink)",
                  }}
                >
                  {p.name}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 15,
                      height: 15,
                      borderRadius: 3,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontFamily: "var(--font-glyph)",
                      fontSize: 10,
                      flex: "none",
                    }}
                  >
                    ‡
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {p.cite}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
