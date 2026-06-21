/**
 * BindingKindIcon — engraving glyph for one of the seven contract
 * binding kinds (verbal · written · blood · breath · item-bound ·
 * name-bound · other).
 *
 * Verbatim from Theourgia Contracts.dc.html `bindGlyph()`. The blood
 * glyph is a single care-desaturated drop (--bind-blood); never gory.
 *
 * Usage: pair with `bindingKindLabel()` for the user-facing label.
 */

import { type CSSProperties } from "react";

export type BindingKind =
  | "verbal"
  | "written"
  | "blood"
  | "breath"
  | "item-bound"
  | "name-bound"
  | "other";

export interface BindingKindIconProps {
  kind: BindingKind;
  /** Width and height in pixels. Defaults to 18. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const ICON_BASE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BindingKindIcon({
  kind,
  size = 18,
  className,
  style,
}: BindingKindIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    ...ICON_BASE,
    "aria-hidden": "true" as const,
    className,
    style,
  };

  switch (kind) {
    case "verbal":
      return (
        <svg {...common}>
          <path d="M5 11c3-4 11-4 14 0M7.5 14.5c2.2-2.6 6.8-2.6 9 0" />
          <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "written":
      return (
        <svg {...common}>
          <path d="M5 19l9.5-9.5 2 2L7 21H5z" />
          <path d="M13.5 7.5l2 2M5 21h5" />
        </svg>
      );
    case "blood":
      // Single drop. Stroke overridden to --bind-blood per the spec.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bind-blood)"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={className}
          style={style}
        >
          <path d="M12 4c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z" />
        </svg>
      );
    case "breath":
      return (
        <svg {...common}>
          <path d="M4 9h9a2.5 2.5 0 1 0-2.5-2.5" />
          <path d="M4 14h12a2.5 2.5 0 1 1-2.5 2.5" />
        </svg>
      );
    case "item-bound":
      return (
        <svg {...common}>
          <path d="M6 9h12v9H6z" />
          <path d="M6 9l6-4 6 4M9.5 18v-5h5v5" />
        </svg>
      );
    case "name-bound":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9 15.5l1.6-7 1.4 4 1.4-4 1.6 7" />
        </svg>
      );
    case "other":
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export function bindingKindLabel(kind: BindingKind): string {
  return {
    verbal: "verbal",
    written: "written",
    blood: "blood",
    breath: "breath",
    "item-bound": "item-bound",
    "name-bound": "name-bound",
    other: "other",
  }[kind];
}
