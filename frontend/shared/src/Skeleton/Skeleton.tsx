/**
 * Skeleton — loading placeholder shape.
 *
 * Three kinds:
 *   text   — a single-line text bar (the default); use multiple for paragraphs
 *   rect   — a generic rectangle
 *   circle — circular (avatar/medallion fill)
 *
 * Pulses gently via CSS animation; the keyframes are tiny and live inline so
 * apps don't need a global stylesheet entry for them. Reduced-motion users see
 * a static dim rectangle (the @keyframes are gated by ``prefers-reduced-motion``
 * via the token layer's pattern).
 */

import type { CSSProperties } from "react";

export type SkeletonKind = "text" | "rect" | "circle";

export interface SkeletonProps {
  kind?: SkeletonKind;
  /** Width override. Pixels or any CSS length. */
  width?: number | string;
  /** Height override. Pixels or any CSS length. */
  height?: number | string;
  /** Accessible label used by SR. Defaults to "Loading". */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

const ANIMATION_NAME = "theourgia-skeleton-pulse";

// Inject the keyframes once (module-level side effect; safe in SSR thanks to
// the `typeof document` guard).
if (typeof document !== "undefined" && !document.getElementById(ANIMATION_NAME)) {
  const style = document.createElement("style");
  style.id = ANIMATION_NAME;
  style.textContent = `
    @keyframes ${ANIMATION_NAME} {
      0%, 100% { opacity: 0.45; }
      50%      { opacity: 0.85; }
    }
    @media (prefers-reduced-motion: reduce) {
      .${ANIMATION_NAME} { animation: none !important; opacity: 0.55 !important; }
    }
  `;
  document.head.appendChild(style);
}

function dimensions(
  kind: SkeletonKind,
  width?: number | string,
  height?: number | string,
): { width: string | number; height: string | number; borderRadius: string } {
  switch (kind) {
    case "text":
      return {
        width: width ?? "100%",
        height: height ?? "1em",
        borderRadius: "var(--r-sm, 4px)",
      };
    case "rect":
      return {
        width: width ?? "100%",
        height: height ?? 80,
        borderRadius: "var(--r-md, 6px)",
      };
    case "circle":
      return {
        width: width ?? 40,
        height: height ?? width ?? 40,
        borderRadius: "50%",
      };
  }
}

export function Skeleton({
  kind = "text",
  width,
  height,
  ariaLabel = "Loading",
  className,
  style,
}: SkeletonProps): JSX.Element {
  const dims = dimensions(kind, width, height);
  const composedStyle: CSSProperties = {
    ...dims,
    background: "var(--line, rgba(255,255,255,0.1))",
    animation: `${ANIMATION_NAME} 1.4s ease-in-out infinite`,
    display: "inline-block",
    ...style,
  };

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={
        className ? `${className} ${ANIMATION_NAME}` : ANIMATION_NAME
      }
      style={composedStyle}
      data-kind={kind}
    />
  );
}
