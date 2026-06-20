/**
 * Glyph — engraving-style icon over the shared SVG sprite.
 *
 * The sprite (``tokens/theourgia-icons.svg``) is injected once at the app
 * root via the host application; this component renders a ``<svg><use/></svg>``
 * referencing one of its symbols by id (``theo-{name}``).
 *
 * Color comes from ``currentColor`` (the engraving thesis — icons inherit the
 * text color token). At sizes ≤16px the stroke bumps to ~2 for legibility.
 *
 * Accessibility:
 * - Pass a ``title`` when the glyph IS the meaning (icon-only buttons).
 * - Omit ``title`` when the glyph is decorative (label or sibling text says
 *   the same thing); the SVG is then ``aria-hidden``.
 */

import type { CSSProperties, SVGAttributes } from "react";
import { type GlyphName } from "./names.js";

export interface GlyphProps
  extends Omit<SVGAttributes<SVGSVGElement>, "children" | "ref"> {
  /** Glyph identifier — must match a ``<symbol>`` in the engraving sprite. */
  name: GlyphName;
  /** Square render size in pixels. Defaults to 20. */
  size?: number;
  /**
   * Accessible label for screen readers. When omitted, the glyph is treated
   * as decorative (``aria-hidden`` true).
   */
  title?: string;
}

export function Glyph({
  name,
  size = 20,
  title,
  style,
  ...rest
}: GlyphProps): JSX.Element {
  const isSmall = size <= 16;
  const composedStyle: CSSProperties = {
    width: size,
    height: size,
    color: "currentColor",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: isSmall ? 2 : 1.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    flexShrink: 0,
    display: "inline-block",
    verticalAlign: "middle",
    ...style,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={composedStyle}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#theo-${name}`} />
    </svg>
  );
}
