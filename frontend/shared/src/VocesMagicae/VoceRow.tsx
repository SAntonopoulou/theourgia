/**
 * VoceRow — the H05 list row. Source-script display text + ‡ for
 * built-ins + transliteration + planetary/elemental chips +
 * recording-count.
 */

import * as React from "react";
import { type CSSProperties } from "react";

import {
  ELEMENTAL_COLOUR,
  ELEMENTAL_GLYPH,
  PLANETARY_GLYPH,
  type ElementalAssoc,
  type PlanetaryAssoc,
  type VoceRecord,
  vmRecordingCountLabel,
} from "./copy.js";

const ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "16px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  textAlign: "left",
  cursor: "pointer",
  width: "100%",
};

function PlayIcon() {
  return (
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
      <path d="M9 18V5l9 7z" />
    </svg>
  );
}

function ChipsRow({
  planets,
  elements,
}: {
  planets: readonly PlanetaryAssoc[];
  elements: readonly ElementalAssoc[];
}) {
  const els: React.ReactElement[] = [];
  planets.forEach((p, i) => {
    els.push(
      <span
        key={`p-${i}`}
        data-planet={p}
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 15,
          color: "var(--accent)",
        }}
      >
        {PLANETARY_GLYPH[p]}
      </span>,
    );
  });
  elements.forEach((e, i) => {
    els.push(
      <span
        key={`e-${i}`}
        data-element={e}
        style={{
          fontFamily: "var(--font-glyph)",
          fontSize: 14,
          color: ELEMENTAL_COLOUR[e],
        }}
      >
        {ELEMENTAL_GLYPH[e]}
      </span>,
    );
  });
  return (
    <span
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
      }}
    >
      {els}
    </span>
  );
}

export interface VoceRowProps {
  voce: VoceRecord;
  onOpen?: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function VoceRow({ voce, onOpen, className, style }: VoceRowProps) {
  const n = voce.recs.length;
  const hasRecording = n > 0;
  return (
    <button
      type="button"
      data-voce-row={voce.id}
      data-builtin={voce.builtin}
      onClick={() => onOpen?.(voce.id)}
      className={className}
      style={{ ...ROW_BASE, ...style }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 23,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {voce.text}
          </span>
          {voce.builtin ? (
            <span
              data-builtin-marker
              title="Built-in reference"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 17,
                height: 17,
                borderRadius: 4,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontFamily: "var(--font-glyph)",
                fontSize: 11,
                flex: "none",
              }}
            >
              ‡
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 13.5,
            color: "var(--ink-mute)",
          }}
        >
          {voce.translit}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: "none",
        }}
      >
        <ChipsRow planets={voce.planets} elements={voce.elements} />
      </div>
      <div
        data-recording-count={n}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flex: "none",
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: hasRecording ? "var(--ink-soft)" : "var(--ink-mute)",
          width: 110,
          justifyContent: "flex-end",
        }}
      >
        {hasRecording ? (
          <span
            aria-hidden="true"
            style={{ display: "flex", color: "var(--accent)" }}
          >
            <PlayIcon />
          </span>
        ) : null}
        {vmRecordingCountLabel(n)}
      </div>
    </button>
  );
}
