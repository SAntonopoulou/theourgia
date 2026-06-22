/**
 * CardReadingRail — right rail showing the selected card's reading.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 144-173. Two states:
 *
 *   • Drawn → position eyebrow · card name · kind + reversed pill ·
 *     "Traditional meaning" + meaning text + citation chrome (‡
 *     A. E. Waite, *The Pictorial Key to the Tarot* (1911) · primary)
 *     · "Your reading" textarea
 *
 *   • Ready (no cards yet) → centred ✶ + the empty prompt
 *
 * Per H04 §S3.3 the citation badge is **load-bearing for scholarly
 * honesty** — every traditional text shipped with this surface MUST
 * carry it.
 */

import { type CSSProperties } from "react";

import type { DrawnCard } from "../divination/index.js";
import {
  TAROT_EMPTY_RAIL,
  TAROT_READING_PLACEHOLDER,
  TAROT_RWS_CITATION,
} from "./copy.js";

export interface CardReadingRailProps {
  /** Selected drawn card. When null/undefined the rail shows the
   *  empty "ready" state. */
  drawn?: DrawnCard | null;
  /** Practitioner's interpretation. Caller-controlled; the surface
   *  persists this. */
  interpretation?: string;
  onInterpretationChange?: (next: string) => void;
  /** Optional override for the source citation (backend may stamp a
   *  different attribution per card). Defaults to the RWS Waite citation. */
  citation?: {
    author: string;
    title: string;
    year: number;
  };
  /** Optional traditional-meaning text for the card. Backend
   *  supplies this per H04 §A.2; surface composes it. */
  meaningText?: string;
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

const REVERSED_PILL: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "2px 9px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-pill, 20px)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-soft)",
};

export function CardReadingRail({
  drawn,
  interpretation = "",
  onInterpretationChange,
  citation = TAROT_RWS_CITATION,
  meaningText,
  className,
  style,
}: CardReadingRailProps) {
  return (
    <aside
      data-component="card-reading-rail"
      data-state={drawn ? "drawn" : "ready"}
      className={`tarot-rail${className ? ` ${className}` : ""}`}
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
          <div style={{ ...EYEBROW, marginBottom: 6 }}>
            {drawn.positionLabel}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 25,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {drawn.card.name}
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {drawn.card.kind}
            </span>
            {drawn.reversed ? (
              <span data-reversed-pill style={REVERSED_PILL}>
                <span
                  style={{ fontFamily: "var(--font-glyph)" }}
                  aria-hidden="true"
                >
                  ⟲
                </span>
                Reversed
              </span>
            ) : null}
          </div>

          <div style={{ ...EYEBROW, marginBottom: 7 }}>
            Traditional meaning
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              margin: "0 0 10px",
            }}
          >
            {meaningText ??
              "Read this card in light of the question and the spread it falls in."}
          </p>

          {/* Citation chrome — ‡ primary badge */}
          <div
            data-citation
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 11px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              marginBottom: 20,
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
              {citation.author},{" "}
              <em style={{ fontStyle: "italic" }}>{citation.title}</em> (
              {citation.year}) · primary
            </span>
          </div>

          <div style={{ ...EYEBROW, marginBottom: 7 }}>Your reading</div>
          <textarea
            rows={4}
            value={interpretation}
            onChange={(e) => onInterpretationChange?.(e.target.value)}
            placeholder={TAROT_READING_PLACEHOLDER}
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
              fontFamily: "var(--font-glyph)",
              fontSize: 34,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            ✶
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
            {TAROT_EMPTY_RAIL}
          </p>
        </div>
      )}
    </aside>
  );
}
