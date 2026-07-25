/**
 * LadderChannelCard — channel 2 of the astragaloi reading: the
 * tetraktys overlay. Sum → sphere (with the mini figure lit), octave
 * band chip and the ground element.
 *
 * The overlay is the Order's own composition, not attested tradition —
 * the corpus meta says so and the drawer shows it verbatim.
 */

import type { CSSProperties } from "react";

import type { AstragaloiLadderChannel } from "../api/types.js";
import { _ } from "../i18n/index.js";
import { SPHERE_NAMES, type SphereNumber, tetraktysLayout } from "../practice/tetraktys.js";

export interface LadderChannelCardProps {
  ladder: AstragaloiLadderChannel;
  sum: number;
  className?: string;
  style?: CSSProperties;
}

const OCTAVE_TONES: Record<AstragaloiLadderChannel["octave"], { color: string; soft: string }> = {
  luminous: { color: "var(--accent)", soft: "var(--accent-soft)" },
  embodied: { color: "var(--peer-ok)", soft: "var(--peer-ok-soft)" },
  chthonic: { color: "var(--moon)", soft: "var(--moon-soft)" },
};

/** The 86px mini tetraktys with the read sphere lit. */
function MiniTetraktys({ lit }: { lit: number }) {
  const layout = tetraktysLayout(86, 86, { top: 13, rowGap: 21, step: 18 });
  return (
    <svg
      viewBox="0 0 86 86"
      width={86}
      height={86}
      role="img"
      aria-label={_("Tetraktys with sphere {n} lit", { n: lit })}
    >
      {layout.points.map((p) => {
        const isLit = p.number === lit;
        return (
          <circle
            key={p.number}
            cx={p.x}
            cy={p.y}
            r={isLit ? 6 : 4.2}
            fill={isLit ? "var(--accent-soft)" : "transparent"}
            stroke={isLit ? "var(--accent)" : "var(--line-2)"}
            strokeWidth={isLit ? 1.7 : 1}
          />
        );
      })}
    </svg>
  );
}

export function LadderChannelCard({ ladder, sum, className, style }: LadderChannelCardProps) {
  const octave = OCTAVE_TONES[ladder.octave];
  const sphereName = SPHERE_NAMES[ladder.sphere as SphereNumber] ?? String(ladder.sphere);
  return (
    <section
      data-component="ladder-channel-card"
      className={className}
      style={{
        padding: "17px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 13,
        }}
      >
        {_("The ladder")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ flex: "none" }}>
          <MiniTetraktys lit={ladder.sphere} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)" }}>
            {_("sum {sum}", { sum })}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 19,
              color: "var(--ink)",
              lineHeight: 1.15,
            }}
          >
            {sphereName}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)" }}>
            {_("sphere {n} of ten", { n: ladder.sphere })}
          </div>
        </div>
      </div>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "7px 14px",
          margin: 0,
        }}
      >
        <dt
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {_("Octave")}
        </dt>
        <dd style={{ margin: 0, display: "flex" }}>
          <span
            data-octave={ladder.octave}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 11px",
              borderRadius: "var(--r-pill, 20px)",
              background: octave.soft,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: octave.color,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: octave.color,
            }}
          >
            {_(ladder.octave)}
          </span>
        </dd>
        <dt
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {_("Ground")}
        </dt>
        <dd
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink-soft)",
          }}
        >
          {ladder.ground_element}
        </dd>
      </dl>
    </section>
  );
}
