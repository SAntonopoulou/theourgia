/**
 * Medallion — entity / identity ring glyph.
 *
 * A circular ringed surface with a glyph centered inside. The pure visual
 * primitive — Avatar wraps this with photo-fallback logic. Entity profiles
 * use Medallion directly.
 *
 * Sizes match Avatar's sizes so the two can stack visually:
 *   sm = 24px · md = 36px · lg = 56px · xl = 96px
 */

import type { CSSProperties } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export type MedallionSize = "sm" | "md" | "lg" | "xl";
export type MedallionTone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

export interface MedallionProps {
  glyph: GlyphName;
  size?: MedallionSize;
  tone?: MedallionTone;
  /** Accessible label. Omit for purely decorative medallions. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

const SIZE_PX: Record<MedallionSize, number> = { sm: 24, md: 36, lg: 56, xl: 96 };
const GLYPH_PX: Record<MedallionSize, number> = { sm: 12, md: 18, lg: 28, xl: 48 };

function toneStyle(tone: MedallionTone): { color: string; bg: string; border: string } {
  switch (tone) {
    case "accent":
      return {
        color: "var(--accent)",
        bg: "var(--accent-soft, var(--bg-2))",
        border: "var(--accent)",
      };
    case "info":
      return { color: "var(--info)", bg: "var(--info-soft, var(--bg-2))", border: "var(--info)" };
    case "success":
      return {
        color: "var(--success)",
        bg: "var(--success-soft, var(--bg-2))",
        border: "var(--success)",
      };
    case "warning":
      return {
        color: "var(--warning)",
        bg: "var(--warning-soft, var(--bg-2))",
        border: "var(--warning)",
      };
    case "danger":
      return {
        color: "var(--danger)",
        bg: "var(--danger-soft, var(--bg-2))",
        border: "var(--danger)",
      };
    default:
      return { color: "var(--ink-soft)", bg: "var(--bg-2)", border: "var(--line)" };
  }
}

export function Medallion({
  glyph,
  size = "md",
  tone = "neutral",
  title,
  className,
  style,
}: MedallionProps) {
  const px = SIZE_PX[size];
  const { color, bg, border } = toneStyle(tone);
  const wrapperStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: "50%",
    backgroundColor: bg,
    color,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: border,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...style,
  };

  return (
    <span
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-tone={tone}
      style={wrapperStyle}
    >
      <Glyph name={glyph} size={GLYPH_PX[size]} />
    </span>
  );
}
