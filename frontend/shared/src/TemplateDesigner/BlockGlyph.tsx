/**
 * BlockGlyph — renders a block-kind's SVG path set.
 *
 * Tiny helper to keep the path data outside JSX so the catalog stays
 * the single source of truth. The colour is inherited from `currentColor`
 * so the calling icon-frame controls the tint.
 */

import { type CSSProperties } from "react";

import { BLOCK_CATALOG, type BlockKind } from "./catalog.js";

export interface BlockGlyphProps {
  kind: BlockKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function BlockGlyph({
  kind,
  size = 15,
  className,
  style,
}: BlockGlyphProps) {
  const paths = BLOCK_CATALOG[kind].glyphPaths;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-block-glyph={kind}
      style={style}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
