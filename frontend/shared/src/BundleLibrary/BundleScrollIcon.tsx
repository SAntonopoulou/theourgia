/**
 * BundleScrollIcon — H09 single-scroll glyph for bundle cards.
 *
 * Deliberately divergent from the PluginKindIcon family (rule
 * 0 — "plugin = code, bundle = data"). The bundle is a scroll;
 * the plugin reads as puzzle / socket.
 */

import type { CSSProperties } from "react";

export interface BundleScrollIconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function BundleScrollIcon({
  size = 20,
  color,
  style,
}: BundleScrollIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-bundle-scroll-icon
      style={style}
    >
      <path d="M7 4.5c-1.4 0-2.2 1-2.2 2.2S5.6 9 7 9M7 4.5h11v15H7M7 9v10.5M7 19.5c-1.4 0-2.2-1-2.2-2.2" />
      <path d="M11 9h4M11 12.5h4" />
    </svg>
  );
}
