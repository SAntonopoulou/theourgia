/**
 * OracleChannelCard — channel 1 of the astragaloi reading: the corpus
 * verse. God (Greek + English), the hexameter, the valence chip and a
 * mono citation line.
 *
 * The surface renders the row it is given and NEVER synthesises a
 * verse for a missing entry — an absent Greek text simply doesn't
 * render (it awaits Nollé, per the corpus caveats).
 */

import type { CSSProperties } from "react";

import type { AstragaloiOracleChannel } from "../api/types.js";
import { _ } from "../i18n/index.js";
import { ValenceGlyph } from "./ValenceGlyph.js";
import { VALENCE_TONES } from "./faces.js";

export interface OracleChannelCardProps {
  oracle: AstragaloiOracleChannel;
  sum: number;
  className?: string;
  style?: CSSProperties;
}

export function OracleChannelCard({ oracle, sum, className, style }: OracleChannelCardProps) {
  const tone = VALENCE_TONES[oracle.valence];
  return (
    <section
      data-component="oracle-channel-card"
      className={className}
      style={{
        padding: "17px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--network-line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--network)",
          }}
        >
          {_("The oracle")}
        </span>
        <span
          data-valence={oracle.valence}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "1px 10px",
            borderRadius: "var(--r-pill, 20px)",
            background: tone.soft,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: tone.color,
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: tone.color,
          }}
        >
          <ValenceGlyph glyph={tone.glyph} />
          {_(tone.label)}
        </span>
      </div>
      <div
        lang="grc"
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 21,
          color: "var(--ink)",
          lineHeight: 1.15,
          marginBottom: 4,
        }}
      >
        {oracle.god_greek}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 13,
        }}
      >
        {oracle.god_english}
      </div>
      {oracle.verse_greek ? (
        <div
          lang="grc"
          data-verse-greek
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            marginBottom: 9,
            whiteSpace: "pre-line",
          }}
        >
          {oracle.verse_greek}
        </div>
      ) : null}
      <blockquote
        style={{
          margin: 0,
          padding: "13px 15px",
          borderLeft: "2px solid var(--network-line)",
          background: "var(--bg-3)",
          borderRadius: "0 var(--r-md, 8px) var(--r-md, 8px) 0",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--ink)",
            whiteSpace: "pre-line",
          }}
        >
          {oracle.verse_english}
        </div>
      </blockquote>
      <div
        data-citation
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          color: "var(--ink-mute)",
          marginTop: 11,
        }}
      >
        {_("Astragalomantic oracle {number} · sum {sum} · {god}", {
          number: oracle.number,
          sum,
          god: oracle.god_english,
        })}
      </div>
    </section>
  );
}
