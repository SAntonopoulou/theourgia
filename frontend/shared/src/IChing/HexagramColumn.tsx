/**
 * HexagramColumn — vertical 6-line stack.
 *
 * Verbatim from `column()` in `Theourgia I Ching.dc.html` (lines
 * 273-287). Renders bottom-up data top-down (the traditional Chinese
 * reading order: line 1 = bottom, line 6 = top, but visually the top
 * line is rendered first).
 *
 *   yang → solid 112×12 --ink bar
 *   yin  → two 48×12 --ink bars with a centre gap
 *   not yet cast → dashed --line outline (the same width)
 *
 * When `mark` is true, changing lines (6 or 9) get a small accent
 * dot to the right.
 */

import { type CSSProperties } from "react";

import {
  type LineValue,
  isChanging,
  isYang,
} from "../divination/index.js";

export interface HexagramColumnProps {
  /** The six line values, bottom→top. Length up to 6; missing lines
   *  render as dashed outline placeholders. */
  lines: readonly LineValue[];
  /** How many lines have been cast (0..6). Lines beyond this index
   *  render as placeholders. Defaults to lines.length. */
  count?: number;
  /** When true, decorate changing lines (6 or 9) with the accent dot. */
  markChanging?: boolean;
  className?: string;
  style?: CSSProperties;
}

const BAR_WIDTH = 112;
const BAR_HEIGHT = 12;
const HALF_WIDTH = 48;

export function HexagramColumn({
  lines,
  count,
  markChanging = false,
  className,
  style,
}: HexagramColumnProps) {
  const formed = count ?? lines.length;

  return (
    <div
      data-component="hexagram-column"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        ...style,
      }}
    >
      {/* Render top→bottom for display order; data is bottom→top. */}
      {[5, 4, 3, 2, 1, 0].map((i) => {
        if (i >= formed) {
          return (
            <div
              key={i}
              data-line-placeholder
              style={{
                width: BAR_WIDTH,
                height: BAR_HEIGHT,
                borderRadius: 2,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line)",
              }}
            />
          );
        }
        const v = lines[i];
        if (v === undefined) return null;
        const yang = isYang(v);
        const changing = markChanging && isChanging(v);
        return (
          <div
            key={i}
            data-line-index={i}
            data-line-value={v}
            data-yang={yang ? "true" : "false"}
            data-changing={changing ? "true" : "false"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            {yang ? (
              <div
                style={{
                  width: BAR_WIDTH,
                  height: BAR_HEIGHT,
                  borderRadius: 2,
                  background: "var(--ink)",
                }}
              />
            ) : (
              <div
                style={{
                  width: BAR_WIDTH,
                  height: BAR_HEIGHT,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: HALF_WIDTH,
                    height: BAR_HEIGHT,
                    borderRadius: 2,
                    background: "var(--ink)",
                  }}
                />
                <div
                  style={{
                    width: HALF_WIDTH,
                    height: BAR_HEIGHT,
                    borderRadius: 2,
                    background: "var(--ink)",
                  }}
                />
              </div>
            )}
            {changing ? (
              <div
                data-changing-dot
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }}
              />
            ) : (
              <div style={{ width: 8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
