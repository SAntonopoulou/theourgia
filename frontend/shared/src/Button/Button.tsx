/**
 * Button — primary interaction primitive.
 *
 * Five variants per the Foundations spec:
 *   primary    — gold accent on accent-ink; the affirmative action
 *   secondary  — surface raised + line border; the neutral action
 *   ghost      — transparent until hover; for low-emphasis actions
 *   danger     — oxblood; destructive / revoke / archive
 *   quiet      — ink-mute text on transparent; nearly invisible until needed
 *
 * Three sizes:
 *   sm — compact (32px tall)
 *   md — default (40px tall)
 *   lg — emphatic (48px tall)
 *
 * Slots for icons on either side (Glyph instances). Loading state disables
 * the button and shows a quiet animated affordance — not a spinner-as-feature
 * per the design's restraint rules; just a dim opacity pulse on the label.
 */

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

import { Glyph, type GlyphName } from "../Glyph/index.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Visual style and emphasis. */
  variant?: ButtonVariant;
  /** Default ``md``. */
  size?: ButtonSize;
  /** Optional glyph rendered before the label. */
  iconStart?: GlyphName;
  /** Optional glyph rendered after the label. */
  iconEnd?: GlyphName;
  /** When true, button is disabled and the label is dimmed. */
  loading?: boolean;
  /** Mirrors the HTML ``type`` attribute. Defaults to ``button``. */
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
}

const SIZE_PADDING: Record<ButtonSize, string> = {
  sm: "6px 12px",
  md: "9px 18px",
  lg: "11px 22px",
};
const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 30, md: 38, lg: 46 };
const SIZE_FONT: Record<ButtonSize, string> = {
  sm: "12px",
  md: "13.5px",
  lg: "15px",
};

interface VariantStyle {
  bg: string;
  color: string;
  border: string;
  fontWeight: number;
}

function variantStyle(variant: ButtonVariant): VariantStyle {
  switch (variant) {
    case "primary":
      return {
        bg: "var(--accent)",
        color: "var(--accent-ink, white)",
        border: "var(--accent)",
        fontWeight: 700,
      };
    case "secondary":
      return {
        bg: "transparent",
        color: "var(--ink-soft)",
        border: "var(--line-2)",
        fontWeight: 500,
      };
    case "ghost":
      return {
        bg: "transparent",
        color: "var(--ink-mute)",
        border: "transparent",
        fontWeight: 500,
      };
    case "danger":
      // Solid form — matches the destructive primary buttons inside the
      // overlay dialogs (Confirm / Alert). For an outline-only "danger"
      // affordance (the Foundations §06 example), apply the style inline.
      return {
        bg: "var(--danger)",
        color: "var(--bg)",
        border: "var(--danger)",
        fontWeight: 700,
      };
    case "quiet":
      return {
        bg: "transparent",
        color: "var(--ink-mute)",
        border: "transparent",
        fontWeight: 500,
      };
  }
}

export function Button({
  variant = "primary",
  size = "md",
  iconStart,
  iconEnd,
  loading = false,
  disabled,
  type = "button",
  className,
  style,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = variantStyle(variant);
  const composedStyle: CSSProperties = {
    backgroundColor: v.bg,
    color: v.color,
    borderColor: v.border,
    minHeight: SIZE_HEIGHT[size],
    padding: SIZE_PADDING[size],
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: SIZE_FONT[size],
    fontWeight: v.fontWeight,
    lineHeight: 1.2,
    letterSpacing: "0.01em",
    borderRadius: "var(--r-md, 8px)",
    borderStyle: "solid",
    borderWidth: "1px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
      aria-busy={loading || undefined}
      className={className}
      style={composedStyle}
      {...rest}
    >
      {iconStart ? <Glyph name={iconStart} size={size === "lg" ? 18 : 16} /> : null}
      <span>{children}</span>
      {iconEnd ? <Glyph name={iconEnd} size={size === "lg" ? 18 : 16} /> : null}
    </button>
  );
}
