/**
 * ChangingLinesPanel — list of changing-line commentary + becoming
 * hexagram footer.
 *
 * Verbatim from `Theourgia I Ching.dc.html` lines 162-177. The
 * becoming hexagram (`relating`) appears at the foot of the panel
 * with a small CJK glyph + English/number + "the situation it is
 * becoming" subline.
 *
 * If there are no changing lines, the surface uses the
 * `ICHING_STABLE_NOTE` instead of rendering this panel — see
 * `IChingSurface`.
 */

import { type CSSProperties } from "react";

import type { HexagramName } from "../divination/index.js";

export interface ChangingLineCommentary {
  /** Display name like "Nine in the third place". */
  name: string;
  /** Per-line commentary text (backend supplies; mockup ships a
   *  generic corpus). */
  text: string;
}

export interface ChangingLinesPanelProps {
  commentary: readonly ChangingLineCommentary[];
  /** The becoming hexagram (relating). */
  relating: HexagramName;
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

export function ChangingLinesPanel({
  commentary,
  relating,
  className,
  style,
}: ChangingLinesPanelProps) {
  return (
    <div
      data-component="changing-lines-panel"
      className={className}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        padding: "16px 18px",
        marginBottom: 18,
        ...style,
      }}
    >
      <div style={{ ...EYEBROW, marginBottom: 12 }}>Changing lines</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {commentary.map((c, i) => (
          <div key={i} data-line-commentary>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              {c.name}
            </div>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "var(--ink-soft)",
                margin: 0,
              }}
            >
              {c.text}
            </p>
          </div>
        ))}
      </div>

      {/* Becoming hexagram footer */}
      <div
        data-relating
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          marginTop: 16,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cjk)",
            fontSize: 26,
            color: "var(--accent)",
          }}
        >
          {relating.chinese}
        </span>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              lineHeight: 1.1,
            }}
          >
            {relating.english} · №{relating.number}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {relating.pinyin} · the situation it is becoming
          </div>
        </div>
      </div>
    </div>
  );
}
