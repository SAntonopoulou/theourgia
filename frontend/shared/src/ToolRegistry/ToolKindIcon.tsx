/**
 * ToolKindIcon — 14 engraving-style icons for the H05 Tool Registry.
 *
 * Each icon is a single SVG with `stroke="currentColor"` so the
 * caller controls colour via the parent. Stroke 1.3 matches the
 * mockup; size defaults to 40 (the grid-card tile uses 44 by prop).
 *
 * Per H05 §S6 #2 these should eventually fold into
 * `tokens/theourgia-icons.svg` as `<symbol>`s so the Entry-composer
 * recommend-tile and any future surface can reuse them via the
 * Glyph component. Tracked as a follow-up batch.
 */

import { type CSSProperties } from "react";

import { type ToolKind } from "./copy.js";

export interface ToolKindIconProps {
  kind: ToolKind;
  /** Tile size in px. Default 40. */
  size?: number;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function ToolKindIcon({
  kind,
  size = 40,
  color,
  className,
  style,
}: ToolKindIconProps) {
  const stroke = color ?? "currentColor";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "data-tool-kind": kind,
    className,
    style,
    "aria-hidden": true,
  };
  switch (kind) {
    case "athame":
      return (
        <svg {...common}>
          <path d="M7 17l7-7 1 1-7 7z" />
          <path d="M14 10l4-4a1.4 1.4 0 0 0-2-2l-4 4" />
          <path d="M6 18l-1 1" />
        </svg>
      );
    case "wand":
      return (
        <svg {...common}>
          <path d="M5 19L17 7" />
          <path d="M17 7l2-2M16 4l.5 1.5L18 6l-1.5.5L16 8l-.5-1.5L14 6l1.5-.5z" />
        </svg>
      );
    case "chalice":
      return (
        <svg {...common}>
          <path d="M7 4h10l-1 6a4 4 0 0 1-8 0z" />
          <path d="M12 14v5M9 19h6" />
        </svg>
      );
    case "pentacle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 5l4.3 8.6H7.7z" transform="rotate(180 12 12)" />
        </svg>
      );
    case "censer":
      return (
        <svg {...common}>
          <path d="M8 21h8l-1-6H9z" />
          <path d="M9 15a3 3 0 0 0 6 0" />
          <path d="M12 3v3M10 5c0 1.5 2 1.5 2 3" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 17a6 6 0 0 1 12 0z" />
          <path d="M12 5v0M10 17a2 2 0 0 0 4 0" />
          <circle cx="12" cy="4" r="1.4" />
        </svg>
      );
    case "sword":
      return (
        <svg {...common}>
          <path d="M5 19l9-9M14 10l5-5-2-2-5 5" />
          <path d="M5 19l1.5-.5M9 14l1 1" />
        </svg>
      );
    case "lamp":
      return (
        <svg {...common}>
          <path d="M9 4h6l-1 5h-4z" />
          <path d="M8 9h8l1 8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" />
          <path d="M12 2v2" />
        </svg>
      );
    case "mirror":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="10" rx="6" ry="7" />
          <path d="M12 17v4M9 21h6" />
        </svg>
      );
    case "bowl":
      return (
        <svg {...common}>
          <path d="M4 11h16a8 8 0 0 1-16 0z" />
          <path d="M8 8c0-1.5 8-1.5 8 0" />
        </svg>
      );
    case "statue":
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="2.4" />
          <path d="M9 21l1-9h4l1 9M8 12h8" />
        </svg>
      );
    case "robe":
      return (
        <svg {...common}>
          <path d="M8 3l-3 4 2 2v11h10V9l2-2-3-4-2 2h-2z" />
        </svg>
      );
    case "cingulum":
      return (
        <svg {...common}>
          <path d="M5 8c4 3 10 3 14 0" />
          <path d="M12 8v8M10 16l2 4 2-4" />
        </svg>
      );
    case "other":
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}
