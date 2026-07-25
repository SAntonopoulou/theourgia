/**
 * ValenceGlyph — the small engraving glyph carried by valence chips:
 * check (favourable) · clock-wait (cautionary) · cross (unfavourable).
 */

import type { ValenceTone } from "./faces.js";

export interface ValenceGlyphProps {
  glyph: ValenceTone["glyph"];
  size?: number;
}

export function ValenceGlyph({ glyph, size = 13 }: ValenceGlyphProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (glyph === "check") {
    return (
      <svg {...common} strokeWidth={2} aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (glyph === "wait") {
    return (
      <svg {...common} strokeWidth={1.7} aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeWidth={1.9} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
