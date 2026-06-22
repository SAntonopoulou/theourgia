/**
 * RuneReadingRail — right rail with selected-stave reading.
 *
 * Verbatim from `Theourgia Runes.dc.html` lines 122-152. Two cases:
 *
 *   • Drawn stave → position eyebrow · 46px rune glyph in --font-rune
 *     + name (display) + OldNorse · keyword + optional merkstave pill ·
 *     Traditional reading text (or merkstave variant) · symmetric
 *     callout when applicable · ‡ rune-poem citation · Your reading
 *     textarea.
 *
 *   • Empty (ready) → centred prompt.
 *
 * §S3.5 enforcement: when the stave is symmetric, the merkstave
 * pill MUST be absent and the symmetric callout MUST appear. The
 * engine forbids merkstave=true on symmetric staves so the surface
 * never has to render that contradiction.
 */

import { type CSSProperties } from "react";

import type { RuneDrawn } from "../divination/index.js";
import {
  RUNES_CITATION,
  RUNES_MERKSTAVE_PILL,
  RUNES_READING_PLACEHOLDER,
  RUNES_SYMMETRIC_NOTE,
  RUNES_TRADITIONAL_EYEBROW,
  RUNES_YOUR_READING_EYEBROW,
} from "./copy.js";

export interface RuneReadingRailProps {
  drawn?: RuneDrawn | null;
  interpretation?: string;
  onInterpretationChange?: (next: string) => void;
  className?: string;
  style?: CSSProperties;
}

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  marginTop: 6,
  padding: "2px 9px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-pill, 20px)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-soft)",
};

export function RuneReadingRail({
  drawn,
  interpretation = "",
  onInterpretationChange,
  className,
  style,
}: RuneReadingRailProps) {
  return (
    <aside
      data-component="rune-reading-rail"
      data-state={drawn ? "drawn" : "ready"}
      className={`rune-rail${className ? ` ${className}` : ""}`}
      style={{
        flex: "none",
        width: 352,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        padding: "22px 22px 24px",
        alignSelf: "stretch",
        ...style,
      }}
    >
      {drawn ? (
        <>
          <div style={{ ...EYEBROW, marginBottom: 8 }}>
            {drawn.positionLabel}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 14,
            }}
          >
            <div
              data-rune-glyph
              style={{
                fontFamily: "var(--font-rune)",
                fontSize: 46,
                lineHeight: 1,
                color: "var(--accent)",
                flex: "none",
                transform: drawn.merkstave ? "rotate(180deg)" : "none",
              }}
            >
              {drawn.rune.glyph}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  margin: 0,
                  lineHeight: 1.05,
                }}
              >
                {drawn.rune.name}
              </h2>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                }}
              >
                {drawn.rune.protoGermanic} · {drawn.rune.keyword}
              </div>
              {drawn.merkstave ? (
                <span data-merkstave-pill style={PILL}>
                  <span
                    style={{ fontFamily: "var(--font-glyph)" }}
                    aria-hidden="true"
                  >
                    ⟲
                  </span>
                  {RUNES_MERKSTAVE_PILL}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ ...EYEBROW, marginBottom: 7 }}>
            {RUNES_TRADITIONAL_EYEBROW}
          </div>
          <p
            data-reading-text
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              margin: "0 0 12px",
            }}
          >
            {drawn.merkstave && drawn.rune.merkstave
              ? drawn.rune.merkstave
              : drawn.rune.upright}
          </p>

          {drawn.rune.symmetric ? (
            <div
              data-symmetric-callout
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                marginBottom: 16,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-rune)",
                  color: "var(--ink-mute)",
                  fontSize: 16,
                  flex: "none",
                  lineHeight: 1.2,
                }}
              >
                {drawn.rune.glyph}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                  lineHeight: 1.4,
                }}
              >
                {RUNES_SYMMETRIC_NOTE}
              </span>
            </div>
          ) : null}

          {/* Citation chrome — ‡ primary */}
          <div
            data-citation
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              marginBottom: 18,
            }}
          >
            <span
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
              aria-hidden="true"
            >
              ‡
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                lineHeight: 1.3,
              }}
            >
              {RUNES_CITATION} · primary
            </span>
          </div>

          <div style={{ ...EYEBROW, marginBottom: 7 }}>
            {RUNES_YOUR_READING_EYEBROW}
          </div>
          <textarea
            rows={3}
            value={interpretation}
            onChange={(e) => onInterpretationChange?.(e.target.value)}
            placeholder={RUNES_READING_PLACEHOLDER}
            data-interpretation
            style={{
              width: "100%",
              padding: "11px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
        </>
      ) : (
        <div
          data-empty-prompt
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: 300,
            textAlign: "center",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-rune)",
              fontSize: 38,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            ᚠ
          </span>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-mute)",
              margin: 0,
              maxWidth: 240,
            }}
          >
            Draw the runes to read.
          </p>
        </div>
      )}
    </aside>
  );
}
