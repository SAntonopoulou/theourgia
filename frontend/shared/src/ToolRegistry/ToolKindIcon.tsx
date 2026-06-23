/**
 * ToolKindIcon — 14 engraving-style icons for the H05 Tool Registry.
 *
 * The shapes live as `<symbol>` entries in
 * `tokens/theourgia-icons.svg` (ids `theo-tool-{kind}`). This
 * component composes a `<svg>` with the right rendering context
 * (stroke colour, stroke-width 1.3, fill: none) and references the
 * symbol via `<use>` — per the H05 §S6 #2 followup that lets any
 * surface reuse a tool icon without duplicating the path data.
 *
 * The sprite must be present in the document (the public-site +
 * admin chrome inline it at the top of the body; tests + storybook
 * include it via `tokens/first-paint.js`).
 */

import { type CSSProperties } from "react";

import { type ToolKind } from "./copy.js";

export interface ToolKindIconProps {
  kind: ToolKind;
  /** Tile size in px. Default 40. */
  size?: number;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

function symbolId(kind: ToolKind): string {
  return `theo-tool-${kind}`;
}

export function ToolKindIcon({
  kind,
  size = 40,
  color,
  className,
  style,
}: ToolKindIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-tool-kind={kind}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <use href={`#${symbolId(kind)}`} />
    </svg>
  );
}
