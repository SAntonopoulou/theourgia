/**
 * TemplateBlockCard — one row on the Template Designer canvas.
 *
 * Per `Theourgia Template Designer.dc.html`. Shows the block's glyph
 * inside a category-tinted square, the kind label (in the category
 * color), an optional "Required" pill, an option summary ("with
 * timer", "H1", etc), the visible label, and the ghost placeholder
 * text in italic muted serif.
 *
 * The selected state pulls a 3px solid colour bar down the left edge
 * and tints the card background. Up / down / remove controls sit at
 * the right.
 */

import { type CSSProperties } from "react";

import {
  BLOCK_CATALOG,
  BLOCK_CATEGORIES,
  type BlockKind,
} from "./catalog.js";
import { BlockGlyph } from "./BlockGlyph.js";

export interface TemplateBlockCardProps {
  /** Stable identifier for the block on the canvas. */
  id: string;
  kind: BlockKind;
  /** Visible label the practitioner sees. Falls back to the kind's
   *  catalog label when empty. */
  label?: string;
  /** Italic placeholder shown beneath the label (the prompt). */
  ghost?: string;
  /** Short option summary ("with timer", "H1", "front view"). */
  optionSummary?: string;
  required?: boolean;
  selected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onSelect?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  className?: string;
  style?: CSSProperties;
}

function ChevronUp({ disabled }: { disabled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: disabled ? "var(--line-2)" : "var(--ink-mute)" }}
    >
      <path d="M6 14l6-6 6 6" />
    </svg>
  );
}

function ChevronDown({ disabled }: { disabled: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      style={{ color: disabled ? "var(--line-2)" : "var(--ink-mute)" }}
    >
      <path d="M6 10l6 6 6-6" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function TemplateBlockCard({
  id,
  kind,
  label,
  ghost,
  optionSummary,
  required = false,
  selected = false,
  isFirst = false,
  isLast = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  className,
  style,
}: TemplateBlockCardProps) {
  const meta = BLOCK_CATALOG[kind];
  const cat = BLOCK_CATEGORIES[meta.category];
  const color = cat.color;
  const visibleLabel = label || meta.label;
  const visibleGhost = ghost || "(no prompt set)";

  return (
    <div
      className={className}
      data-component="template-block-card"
      data-block-id={id}
      data-block-kind={kind}
      data-block-category={meta.category}
      data-selected={selected ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "14px 14px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: selected ? color : "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: selected ? "var(--bg-2)" : "var(--bg-3)",
        boxShadow: selected ? `inset 3px 0 0 ${color}` : "none",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 13,
          width: "100%",
          textAlign: "left",
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            flex: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
          }}
        >
          <BlockGlyph kind={kind} size={16} />
        </span>
        <span
          style={{
            minWidth: 0,
            flex: 1,
            display: "block",
            paddingTop: 1,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 3,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color,
              }}
            >
              {meta.label}
            </span>
            {required ? (
              <span
                data-required-badge
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 9.5,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  padding: "1px 6px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line-2)",
                  borderRadius: 999,
                }}
              >
                Required
              </span>
            ) : null}
            {optionSummary ? (
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {optionSummary}
              </span>
            ) : null}
          </span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: 16.5,
              color: "var(--ink)",
            }}
          >
            {visibleLabel}
          </span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-mute)",
              marginTop: 3,
            }}
          >
            {visibleGhost}
          </span>
        </span>
      </button>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: "none",
        }}
      >
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move up"
          style={{
            width: 28,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 5,
            background: "transparent",
            border: "none",
            cursor: isFirst ? "default" : "pointer",
          }}
        >
          <ChevronUp disabled={isFirst} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move down"
          style={{
            width: 28,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 5,
            background: "transparent",
            border: "none",
            cursor: isLast ? "default" : "pointer",
          }}
        >
          <ChevronDown disabled={isLast} />
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove block"
            style={{
              width: 28,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 5,
              color: "var(--ink-mute)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <RemoveIcon />
          </button>
        ) : null}
      </span>
    </div>
  );
}
