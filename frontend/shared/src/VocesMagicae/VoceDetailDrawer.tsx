/**
 * VoceDetailDrawer — right-side drawer (560px) showing the voce in
 * full: large source text + transliteration + IPA + ‡ citation +
 * Associations + Recordings + Used-in-workings.
 *
 * Recordings append (Record new button); the empty-state copy is
 * load-bearing and verbatim. Used-in-workings is computed and
 * read-only.
 */

import * as React from "react";
import { type CSSProperties, useRef } from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import {
  ELEMENTAL_COLOUR,
  ELEMENTAL_GLYPH,
  ELEMENTAL_NAME,
  PLANETARY_GLYPH,
  PLANETARY_NAME,
  VM_ASSOCIATIONS_EYEBROW,
  VM_EMPTY_RECORDINGS_NOTE,
  VM_READONLY_PILL,
  VM_RECORDINGS_EYEBROW,
  VM_RECORD_NEW_LABEL,
  VM_USED_IN_WORKINGS_EYEBROW,
  type VoceRecord,
} from "./copy.js";
import { Waveform } from "./Waveform.js";

const SCRIM_WRAP: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "flex",
  justifyContent: "flex-end",
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.5)",
};

const PANEL_STYLE: CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
  height: "100%",
  overflowY: "auto",
  background: "var(--bg)",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line-2)",
  boxShadow: "-2px 0 30px rgba(0,0,0,.4)",
};

const HEADER_STYLE: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: "14px 22px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function PlayCircle() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function AssociationChips({ voce }: { voce: VoceRecord }) {
  const chips: React.ReactElement[] = [];
  voce.planets.forEach((p, i) => {
    chips.push(
      <span
        key={`p-${i}`}
        data-planet-chip={p}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 11px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--accent-soft)",
          borderRadius: "var(--r-pill, 20px)",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--accent)",
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)" }}>
          {PLANETARY_GLYPH[p]}
        </span>
        {PLANETARY_NAME[p]}
      </span>,
    );
  });
  voce.elements.forEach((e, i) => {
    chips.push(
      <span
        key={`e-${i}`}
        data-element-chip={e}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 11px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-pill, 20px)",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: ELEMENTAL_COLOUR[e],
        }}
      >
        <span style={{ fontFamily: "var(--font-glyph)" }}>
          {ELEMENTAL_GLYPH[e]}
        </span>
        {ELEMENTAL_NAME[e]}
      </span>,
    );
  });
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{chips}</span>
  );
}

function EntityChips({ voce }: { voce: VoceRecord }) {
  if (voce.entities.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {voce.entities.map((entity, i) => (
        <span
          key={`ent-${i}`}
          data-entity-chip={entity.name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 11px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-pill, 20px)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-glyph)",
              color: "var(--accent)",
            }}
          >
            {entity.glyph}
          </span>
          {entity.name}
        </span>
      ))}
    </div>
  );
}

export interface VoceDetailDrawerProps {
  open: boolean;
  voce: VoceRecord | null;
  onClose: () => void;
  onRecordNew?: (voceId: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function VoceDetailDrawer({
  open,
  voce,
  onClose,
  onRecordNew,
  className,
  style,
}: VoceDetailDrawerProps) {
  // Escape closes the drawer (b108-2fy a11y sweep).
  useEscapeToClose(open, onClose);
  // Detail drawer has no primary form input; focus the drawer container
  // itself so the caret enters the drawer (b108-2g2 a11y sweep).
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusOnOpen(panelRef, open);
  useFocusTrap(panelRef, open);

  if (!open || !voce) return null;
  const hasRecordings = voce.recs.length > 0;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voce detail"
      data-component="voce-detail-drawer"
      data-voce-id={voce.id}
      className={className}
      style={{ ...SCRIM_WRAP, ...style }}
    >
      <div onClick={onClose} style={SCRIM_BG} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="scroll"
        style={{ ...PANEL_STYLE, outline: "none" }}
      >
        <div style={HEADER_STYLE}>
          <button
            type="button"
            aria-label="Close"
            data-action="close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              color: "var(--ink-mute)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <svg
              width={17}
              height={17}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "8px 26px 30px" }}>
          {/* Hero */}
          <div
            data-section="hero"
            style={{
              textAlign: "center",
              padding: "18px 0 22px",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--line)",
              marginBottom: 22,
            }}
          >
            <div
              data-voce-text
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 40,
                lineHeight: 1.1,
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              {voce.text}
            </div>
            <div
              data-voce-translit
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--ink-soft)",
                marginBottom: 4,
              }}
            >
              {voce.translit}
            </div>
            <div
              data-voce-ipa
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink-mute)",
              }}
            >
              {voce.ipa}
            </div>
          </div>

          {/* Citation */}
          <div
            data-section="citation"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 20,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: 4,
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontFamily: "var(--font-glyph)",
                fontSize: 12,
                flex: "none",
              }}
            >
              ‡
            </span>
            <span
              data-voce-citation
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                lineHeight: 1.35,
              }}
            >
              {voce.citation}
            </span>
          </div>

          {/* Associations */}
          <div data-section="associations" style={{ marginBottom: 22 }}>
            <div style={{ ...EYEBROW, marginBottom: 10 }}>
              {VM_ASSOCIATIONS_EYEBROW}
            </div>
            <div style={{ marginBottom: 10 }}>
              <AssociationChips voce={voce} />
            </div>
            <EntityChips voce={voce} />
          </div>

          {/* Recordings */}
          <div data-section="recordings" style={{ marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span style={EYEBROW}>{VM_RECORDINGS_EYEBROW}</span>
              <button
                type="button"
                data-action="record-new"
                onClick={() => onRecordNew?.(voce.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 13px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--accent)",
                  borderRadius: "var(--r-md)",
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink)",
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
                  <rect x={9} y={3} width={6} height={11} rx={3} />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
                {VM_RECORD_NEW_LABEL}
              </button>
            </div>
            {hasRecordings ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {voce.recs.map((rec, i) => (
                  <div
                    key={i}
                    data-recording-row={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 13px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-2)",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Play"
                      data-action="play"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        color: "var(--accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <PlayCircle />
                    </button>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <Waveform seed={rec.seed} />
                    </span>
                    <div
                      style={{
                        flex: "none",
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--ink-soft)",
                        }}
                      >
                        {rec.d}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {rec.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                data-empty-recordings-note
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "var(--ink-mute)",
                  margin: 0,
                }}
              >
                {VM_EMPTY_RECORDINGS_NOTE}
              </p>
            )}
          </div>

          {/* Used in workings */}
          <div data-section="workings">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span style={EYEBROW}>{VM_USED_IN_WORKINGS_EYEBROW}</span>
              <span
                data-readonly-pill
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--ink-mute)",
                  padding: "1px 7px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-pill, 20px)",
                }}
              >
                {VM_READONLY_PILL}
              </span>
            </div>
            {voce.workings.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  margin: 0,
                }}
              >
                No workings have referenced this voce yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {voce.workings.map((w, i) => (
                  <div
                    key={i}
                    data-working-row={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 2px",
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid",
                      borderBottomColor: "var(--line)",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-display)",
                        fontSize: 14.5,
                        color: "var(--ink)",
                      }}
                    >
                      {w.title}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {w.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
