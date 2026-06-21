/**
 * IconButton — single glyph, no visible text label.
 *
 * Used for compact toolbars, segmented actions, drawer triggers. Requires
 * an accessible ``label`` (never a visual element; screen readers only —
 * native browser dialogs are forbidden, but the SR-only label discipline
 * applies everywhere icon-only controls live).
 */

import type { ButtonHTMLAttributes, CSSProperties } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

import type { ButtonSize, ButtonVariant } from "./Button.js";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children" | "aria-label"> {
  glyph: GlyphName;
  /** Required — screen-reader-only label. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}

const SIZE_PX: Record<ButtonSize, number> = { sm: 30, md: 38, lg: 46 };
const GLYPH_PX: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "var(--accent)",
        color: "var(--accent-ink)",
        border: "1px solid var(--accent)",
      };
    case "secondary":
      return {
        background: "var(--bg-2)",
        color: "var(--ink)",
        border: "1px solid var(--line)",
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--ink)",
        border: "1px solid transparent",
      };
    case "danger":
      return {
        background: "var(--danger)",
        color: "var(--bg)",
        border: "1px solid var(--danger)",
      };
    case "quiet":
      return {
        background: "transparent",
        color: "var(--ink-mute)",
        border: "1px solid transparent",
      };
  }
}

export function IconButton({
  glyph,
  label,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className,
  style,
  ...rest
}: IconButtonProps) {
  const isDisabled = disabled || loading;
  const composedStyle: CSSProperties = {
    ...variantStyle(variant),
    width: SIZE_PX[size],
    height: SIZE_PX[size],
    borderRadius: "var(--r-md, 6px)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
    transition:
      "background-color 150ms ease, color 150ms ease, border-color 150ms ease, opacity 150ms ease",
    ...style,
  };
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={loading || undefined}
      className={className}
      style={composedStyle}
      {...rest}
    >
      <Glyph name={glyph} size={GLYPH_PX[size]} />
    </button>
  );
}
