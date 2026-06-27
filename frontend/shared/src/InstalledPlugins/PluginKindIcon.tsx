/**
 * PluginKindIcon — 14 plugin-kind sprites (H09 §S0).
 *
 * Reused across Installed Plugins (1) · Plugin Detail (2) ·
 * Registry Browser (7) · Registry Plugin Detail (8) · Plugin
 * Author Profile (9).
 */

import type { CSSProperties } from "react";

import type { PluginKind } from "./copy.js";

export interface PluginKindIconProps {
  kind: PluginKind;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function PluginKindIcon({
  kind,
  size = 19,
  color,
  style,
}: PluginKindIconProps) {
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
      data-plugin-kind-icon={kind}
      style={style}
    >
      {KIND_PATHS[kind] ?? KIND_PATHS["widget"]}
    </svg>
  );
}

const KIND_PATHS: Record<PluginKind, React.ReactNode> = {
  divination: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  cipher: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  correspondence: (
    <path d="M4 5h16M4 5v14h16V5M9 5v14M4 12h5M14 9h2M14 13h2" />
  ),
  "editor-block": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </>
  ),
  widget: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.4" />
      <rect x="13" y="4" width="7" height="7" rx="1.4" />
      <rect x="4" y="13" width="7" height="7" rx="1.4" />
      <rect x="13" y="13" width="7" height="7" rx="1.4" />
    </>
  ),
  exporter: (
    <path d="M12 16V4M8 8l4-4 4 4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
  ),
  importer: (
    <path d="M12 4v12M8 12l4 4 4-4M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
  ),
  notification: (
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
  ),
  auth: (
    <>
      <circle cx="12" cy="9" r="3" />
      <path d="M12 12v4M6 20a6 6 0 0 1 12 0" />
    </>
  ),
  storage: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </>
  ),
  email: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  "federation-event": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" />
    </>
  ),
  "ap-object": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4.5v3M12 16.5v3M4.5 12h3M16.5 12h3M6.6 6.6l2.1 2.1M15.3 15.3l2.1 2.1M17.4 6.6l-2.1 2.1M8.7 15.3l-2.1 2.1" />
    </>
  ),
};
