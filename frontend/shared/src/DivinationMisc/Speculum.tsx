/**
 * Speculum — scrying disc (180×180 circle with radial gradient).
 *
 * Verbatim from `speculumEl()` in `Theourgia Divination Misc.dc.html`
 * (lines 307-311). The fill is per-medium (mirror = obsidian-dark
 * mockup hex; the other three are calibrated tints).
 */

import { type CSSProperties } from "react";

import type { ScryMedium } from "./copy.js";

const MEDIUM_FILL: Record<ScryMedium, string> = {
  mirror: "#0C0A08",
  crystal: "rgba(180, 190, 210, .10)",
  water: "rgba(90, 120, 150, .14)",
  fire: "rgba(200, 120, 60, .14)",
};

export interface SpeculumProps {
  medium: ScryMedium;
  className?: string;
  style?: CSSProperties;
}

export function Speculum({ medium, className, style }: SpeculumProps) {
  const fill = MEDIUM_FILL[medium];
  return (
    <div
      data-component="speculum"
      data-medium={medium}
      role="img"
      aria-label={`Scrying ${medium}`}
      className={className}
      style={{
        width: 180,
        height: 180,
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        background: `radial-gradient(circle at 42% 36%, rgba(255,255,255,.05), ${fill} 72%)`,
        boxShadow:
          "inset 0 0 40px rgba(0,0,0,.6), 0 0 0 6px var(--bg-2)",
        ...style,
      }}
    />
  );
}
