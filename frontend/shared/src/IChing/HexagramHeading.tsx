/**
 * HexagramHeading — CJK glyph + English name + Pinyin + King-Wen
 * number + trigram composition.
 *
 * Verbatim from `Theourgia I Ching.dc.html` lines 148-154. The CJK
 * glyph is 48px in --accent, the English is 26px display, the King-Wen
 * number is shown in display 18px --accent.
 */

import { type CSSProperties } from "react";

import type { HexagramName } from "../divination/index.js";

export interface HexagramHeadingProps {
  hexagram: HexagramName;
  /** Composition string like "☷ Earth over ☰ Heaven". Caller supplies
   *  this via `trigramComposition()` from the engine. */
  composition?: string;
  className?: string;
  style?: CSSProperties;
}

export function HexagramHeading({
  hexagram,
  composition,
  className,
  style,
}: HexagramHeadingProps) {
  return (
    <div
      data-component="hexagram-heading"
      data-hexagram-number={hexagram.number}
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        marginBottom: 18,
        ...style,
      }}
    >
      <div
        data-cjk
        style={{
          fontFamily: "var(--font-cjk)",
          fontSize: 48,
          lineHeight: 1,
          color: "var(--accent)",
          flex: "none",
        }}
      >
        {hexagram.chinese}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              lineHeight: 1.05,
            }}
          >
            {hexagram.english}
          </span>
          <span
            data-hex-number
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--accent)",
            }}
          >
            №{hexagram.number}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-mute)",
            marginTop: 2,
          }}
        >
          {hexagram.pinyin}
          {composition ? ` · ${composition}` : null}
        </div>
      </div>
    </div>
  );
}
