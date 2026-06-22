/**
 * AttestationKindBadge — coloured glyph square for an attestation kind.
 *
 * Two sizes match the design exactly:
 *   - 24×24 (small): used in list rows, header label rows
 *   - 40×40 (large): used in the detail header
 *
 * The colour comes from `ATTESTATION_KIND_META[kind].color` (an `--at-*`
 * token); the box paints with that colour mixed 15% into transparent.
 */

import { type CSSProperties } from "react";

import {
  ATTESTATION_KIND_META,
  type AttestationKind,
} from "./attestations.js";

export interface AttestationKindBadgeProps {
  kind: AttestationKind;
  /** Box edge length in px. Glyph scales to ~60% of the box. */
  size?: 24 | 40;
  /** Show a 1px line-2 border around the badge (true for the large variant). */
  bordered?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function AttestationKindBadge({
  kind,
  size = 24,
  bordered = false,
  className,
  style,
  title,
}: AttestationKindBadgeProps) {
  const meta = ATTESTATION_KIND_META[kind];
  const glyphSize = size === 40 ? 18 : 14;
  const radius = size === 40 ? 10 : 6;

  return (
    <span
      className={className}
      title={title}
      data-component="attestation-kind-badge"
      data-attestation-kind={kind}
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: radius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
        ...(bordered
          ? {
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
            }
          : null),
        ...style,
      }}
    >
      <svg
        width={glyphSize}
        height={glyphSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={meta.glyph} />
      </svg>
    </span>
  );
}
