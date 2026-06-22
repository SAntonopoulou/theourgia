/**
 * TarotCardFace — single card visual.
 *
 * Verbatim from `cardFace()` in `Theourgia Tarot.dc.html` (lines
 * 263-290). Height = round(width × 1.5). Three modes:
 *
 *   • face-down → diagonal striped --bg-3/--bg-2 backing + small
 *     accent ring SVG (the deck mark)
 *   • face-up Major → "MAJOR" eyebrow + big numeral + name
 *   • face-up Minor → suit eyebrow + big suit glyph + name
 *
 * Reversed shows the body rotated 180° + a small ⟲ glyph top-right.
 * Selected gets a 2px accent ring + bigger shadow. Per H04 §S3.1 the
 * reversal indicator is gentle — NEVER red.
 *
 * Card images come from the backend (PD RWS) per H04 §A.2; this
 * component renders the typographic placeholder until they arrive.
 */

import { type CSSProperties } from "react";

import type { TarotCard } from "../divination/index.js";

export interface TarotCardFaceProps {
  card: TarotCard;
  /** Card width in px; height is derived as round(width × 1.5). */
  width: number;
  faceDown?: boolean;
  reversed?: boolean;
  selected?: boolean;
  /** Rotation in degrees applied to the whole tile (used by Celtic
   *  Cross for the Crossing card). */
  rotation?: number;
  /** Position label on the board ("Past", "Crown", etc.); folded into
   *  the aria-label for screen readers. */
  positionLabel?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const RING = (
  <svg
    width="50%"
    height="50%"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="20"
      cy="20"
      r="17"
      stroke="var(--accent)"
      strokeWidth={1.1}
      opacity={0.6}
    />
    <circle
      cx="20"
      cy="20"
      r="11"
      stroke="var(--accent)"
      strokeWidth={0.8}
      opacity={0.4}
    />
    <line
      x1="9"
      y1="20"
      x2="31"
      y2="20"
      stroke="var(--accent)"
      strokeWidth={1.1}
      opacity={0.6}
    />
  </svg>
);

export function TarotCardFace({
  card,
  width,
  faceDown = false,
  reversed = false,
  selected = false,
  rotation,
  positionLabel,
  onClick,
  className,
  style,
}: TarotCardFaceProps) {
  const height = Math.round(width * 1.5);

  const ariaLabel = positionLabel
    ? `${positionLabel}: ${faceDown ? "face down" : card.name}`
    : faceDown
      ? "face down"
      : card.name;

  const innerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    transform: reversed && !faceDown ? "rotate(180deg)" : "none",
  };

  let inner: React.ReactNode;
  if (faceDown) {
    inner = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "repeating-linear-gradient(45deg, var(--bg-3), var(--bg-3) 6px, var(--bg-2) 6px, var(--bg-2) 12px)",
        }}
      >
        {RING}
      </div>
    );
  } else if (card.kind === "Major Arcana") {
    inner = (
      <div
        style={{
          ...innerStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${width * 0.1}px ${width * 0.06}px`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: Math.max(7, width * 0.085),
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Major
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: width * 0.34,
            lineHeight: 1,
            color: "var(--accent)",
          }}
        >
          {card.numeral ?? ""}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: Math.max(9, width * 0.135),
            lineHeight: 1.05,
            textAlign: "center",
            color: "var(--ink)",
          }}
        >
          {card.name}
        </div>
      </div>
    );
  } else {
    // Minor Arcana
    inner = (
      <div
        style={{
          ...innerStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${width * 0.1}px ${width * 0.06}px`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: Math.max(7, width * 0.085),
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {card.suit ?? ""}
        </div>
        <div
          style={{
            fontFamily: "var(--font-glyph)",
            fontSize: width * 0.3,
            lineHeight: 1,
            color: "var(--accent)",
          }}
          aria-hidden="true"
        >
          {card.suitGlyph ?? ""}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: Math.max(9, width * 0.135),
            lineHeight: 1.05,
            textAlign: "center",
            color: "var(--ink)",
          }}
        >
          {card.name}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-component="tarot-card-face"
      data-card-name={card.name}
      data-face-down={faceDown ? "true" : "false"}
      data-reversed={reversed ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      className={className}
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 7,
        overflow: "hidden",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? "var(--accent)" : "var(--line-2)",
        background: "var(--bg-3)",
        boxShadow: selected
          ? "0 0 0 2px var(--accent-soft), 0 6px 18px rgba(0,0,0,.35)"
          : "0 3px 10px rgba(0,0,0,.28)",
        transform: rotation ? `rotate(${rotation}deg)` : "none",
        transition: "box-shadow .15s ease, border-color .15s ease",
        flex: "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {inner}
      {!faceDown && reversed ? (
        <span
          data-reversed-indicator
          style={{
            position: "absolute",
            top: 4,
            right: 5,
            fontFamily: "var(--font-glyph)",
            fontSize: 10,
            color: "var(--ink-mute)",
          }}
          aria-hidden="true"
        >
          ⟲
        </span>
      ) : null}
    </button>
  );
}
