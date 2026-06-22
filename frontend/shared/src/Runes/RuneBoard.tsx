/**
 * RuneBoard — framed gradient panel + positioned rune tiles.
 *
 * Verbatim from `Theourgia Runes.dc.html` lines 116-119. Uses the
 * layout positions from `layoutForSize(size)` in the engine (B78b):
 *
 *   size=1 → centre stave only
 *   size=3 → the three Norns (Urðr · Verðandi · Skuld), horizontal row
 *   size=5 → five-stave cross (centre + above + below + left + right)
 *
 * The frame uses --line border + --bg-2 → --bg-sunk gradient.
 */

import { type CSSProperties } from "react";

import {
  type RuneDrawSize,
  type RuneDrawn,
  layoutForSize,
} from "../divination/index.js";
import { RuneTile } from "./RuneTile.js";

export interface RuneBoardProps {
  size: RuneDrawSize;
  /** The drawn staves (one per position in the layout). When null,
   *  the surface is in the pre-draw state and the board renders
   *  empty. */
  drawn?: readonly RuneDrawn[] | null;
  selected?: number;
  onSelect?: (positionIndex: number) => void;
  /** Tile width in px. Defaults to 104. */
  tileWidth?: number;
  className?: string;
  style?: CSSProperties;
}

const BOARD_HEIGHTS: Record<RuneDrawSize, number> = {
  1: 200,
  3: 200,
  5: 400,
};

export function RuneBoard({
  size,
  drawn,
  selected,
  onSelect,
  tileWidth = 104,
  className,
  style,
}: RuneBoardProps) {
  const layout = layoutForSize(size);
  const boardHeight = BOARD_HEIGHTS[size];

  if (!drawn) {
    return (
      <div
        data-component="rune-board"
        data-state="empty"
        data-size={size}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: boardHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...style,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--ink-mute)",
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {layout.name}
        </div>
      </div>
    );
  }

  return (
    <div
      data-component="rune-board"
      data-state="drawn"
      data-size={size}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: boardHeight,
        ...style,
      }}
    >
      {layout.positions.map((pos, i) => {
        const drawnAt = drawn[i];
        if (!drawnAt) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <RuneTile
              rune={drawnAt.rune}
              positionLabel={pos.label}
              merkstave={drawnAt.merkstave}
              selected={selected === i}
              width={tileWidth}
              onClick={onSelect ? () => onSelect(i) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
