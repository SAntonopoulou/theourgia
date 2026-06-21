/**
 * Banner — persistent inline notification.
 *
 * Sits above content (not portaled) and stays until dismissed (if
 * `dismissible`) or removed by the caller. Used for "encryption mode
 * enabled," "you are offline," "draft saved" — anything that needs to
 * stay visible without blocking interaction.
 *
 * Tone-driven; glyph-paired per the color-never-alone rule.
 */

import type { CSSProperties, ReactNode } from "react";

import { Button } from "../Button/index.js";
import { Glyph, type GlyphName } from "../Glyph/index.js";

export type BannerTone = "info" | "success" | "warning" | "danger";

export interface BannerAction {
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  tone: BannerTone;
  title: ReactNode;
  body?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: BannerAction;
  glyph?: GlyphName;
  className?: string;
  style?: CSSProperties;
}

const TONE_GLYPH: Record<BannerTone, GlyphName> = {
  info: "scroll",
  success: "key",
  warning: "bell",
  danger: "lock",
};

// Banner backgrounds use color-mix to tint bg-2 with the tone hue — matches
// the design's sandbox banner in Overlays.dc.html. Border uses line-2.
const TONE_COLOR: Record<BannerTone, { fg: string; bg: string; border: string }> = {
  info: {
    fg: "var(--info)",
    bg: "color-mix(in srgb, var(--info) 16%, var(--bg-2))",
    border: "var(--line-2)",
  },
  success: {
    fg: "var(--success)",
    bg: "color-mix(in srgb, var(--success) 14%, var(--bg-2))",
    border: "var(--line-2)",
  },
  warning: {
    fg: "var(--warning)",
    bg: "color-mix(in srgb, var(--warning) 16%, var(--bg-2))",
    border: "var(--line-2)",
  },
  danger: {
    fg: "var(--danger)",
    bg: "color-mix(in srgb, var(--danger) 16%, var(--bg-2))",
    border: "var(--line-2)",
  },
};

export function Banner({
  tone,
  title,
  body,
  dismissible = false,
  onDismiss,
  action,
  glyph,
  className,
  style,
}: BannerProps) {
  const palette = TONE_COLOR[tone];
  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: body ? "flex-start" : "center",
    gap: 12,
    padding: "13px 16px",
    backgroundColor: palette.bg,
    color: "var(--ink)",
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: palette.border,
    borderRadius: "var(--r-md, 8px)",
    fontFamily: "var(--font-ui)",
    ...style,
  };

  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      data-tone={tone}
      className={className}
      style={containerStyle}
    >
      <span style={{ color: palette.fg, flexShrink: 0, marginTop: body ? 2 : 0 }}>
        <Glyph name={glyph ?? TONE_GLYPH[tone]} size={18} />
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            fontSize: 13,
            color: "var(--ink)",
          }}
        >
          {title}
        </span>
        {body ? (
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{body}</span>
        ) : null}
      </div>
      {action ? (
        <Button size="sm" variant="quiet" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
      {dismissible ? (
        <Button size="sm" variant="quiet" onClick={onDismiss} aria-label="Dismiss">
          ×
        </Button>
      ) : null}
    </div>
  );
}
