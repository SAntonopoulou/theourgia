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
  sm: "var(--space-1, 4px) var(--space-3, 12px)",
  md: "var(--space-2, 8px) var(--space-4, 16px)",
  lg: "var(--space-3, 12px) var(--space-5, 24px)",
};
const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 32, md: 40, lg: 48 };
const SIZE_FONT: Record<ButtonSize, string> = {
  sm: "var(--type-ui, 13px)",
  md: "var(--type-body-sm, 14px)",
  lg: "var(--type-body, 16px)",
};

function variantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        backgroundColor: "var(--accent)",
        color: "var(--accent-ink)",
        borderColor: "var(--accent)",
      };
    case "secondary":
      return {
        backgroundColor: "var(--bg-2)",
        color: "var(--ink)",
        borderColor: "var(--line)",
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: "var(--ink)",
        borderColor: "transparent",
      };
    case "danger":
      return {
        backgroundColor: "var(--danger)",
        color: "var(--bg)",
        borderColor: "var(--danger)",
      };
    case "quiet":
      return {
        backgroundColor: "transparent",
        color: "var(--ink-mute)",
        borderColor: "transparent",
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
  const composedStyle: CSSProperties = {
    ...variantStyle(variant),
    minHeight: SIZE_HEIGHT[size],
    padding: SIZE_PADDING[size],
    fontFamily: "var(--font-ui, system-ui, sans-serif)",
    fontSize: SIZE_FONT[size],
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: "0.01em",
    borderRadius: "var(--r-md, 6px)",
    borderStyle: "solid",
    borderWidth: "1px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2, 8px)",
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
