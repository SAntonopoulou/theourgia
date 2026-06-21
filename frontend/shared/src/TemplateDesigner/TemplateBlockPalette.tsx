/**
 * TemplateBlockPalette — categorized list of block kinds to add to
 * the canvas.
 *
 * Per `Theourgia Template Designer.dc.html`. Three sections in a
 * fixed order: Magickal blocks, Formatting, Inline marks. Each
 * section header carries the category's color dot. Each block is a
 * button that calls `onAdd(kind)`.
 *
 * Caller can pass `categories` to limit which sections render — by
 * default all three appear.
 */

import { type CSSProperties } from "react";

import {
  BLOCK_CATALOG,
  BLOCK_CATEGORIES,
  BLOCK_CATEGORY_ORDER,
  type BlockCategory,
  type BlockKind,
  blockKindsByCategory,
} from "./catalog.js";
import { BlockGlyph } from "./BlockGlyph.js";

export interface TemplateBlockPaletteProps {
  onAdd?: (kind: BlockKind) => void;
  /** Restrict the palette to a subset of categories. */
  categories?: BlockCategory[];
  className?: string;
  style?: CSSProperties;
}

export function TemplateBlockPalette({
  onAdd,
  categories,
  className,
  style,
}: TemplateBlockPaletteProps) {
  const sections = (categories ?? BLOCK_CATEGORY_ORDER).map((cat) => ({
    category: cat,
    meta: BLOCK_CATEGORIES[cat],
    kinds: blockKindsByCategory(cat),
  }));

  return (
    <div
      className={className}
      data-component="template-block-palette"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        ...style,
      }}
    >
      {sections.map(({ category, meta, kinds }) => (
        <section key={category} data-palette-category={category}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: meta.color,
                flex: "none",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              {meta.label}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {kinds.map(({ kind }) => (
              <button
                key={kind}
                type="button"
                data-palette-kind={kind}
                onClick={() => onAdd?.(kind)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  textAlign: "left",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "transparent",
                  borderRadius: 7,
                  background: "transparent",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    flex: "none",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: meta.color,
                    background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                  }}
                >
                  <BlockGlyph kind={kind} size={14} />
                </span>
                {BLOCK_CATALOG[kind].label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
