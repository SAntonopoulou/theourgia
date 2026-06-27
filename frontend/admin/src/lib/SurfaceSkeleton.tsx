/**
 * Skeleton loader — the established admin convention for surface
 * loading states.
 *
 * Renders a calm row-grid of placeholder bars. Per-surface skeletons
 * compose this primitive with surface-specific row counts and widths
 * so the loading state visually approximates the final layout.
 */

import type { CSSProperties } from "react";

export interface SurfaceSkeletonProps {
  /** How many bars to render. */
  readonly rowCount?: number;
  /** Optional class for surface-specific tuning. */
  readonly className?: string;
}

const ROOT: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
};

const ROW: CSSProperties = {
  height: 56,
  borderRadius: 6,
  background: "var(--bg-2)",
  position: "relative",
  overflow: "hidden",
};

const SHIMMER: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, transparent 0%, var(--bg-3) 50%, transparent 100%)",
  animationName: "surface-skel-shimmer",
  animationDuration: "1.4s",
  animationIterationCount: "infinite",
  animationTimingFunction: "linear",
};

export function SurfaceSkeleton({
  rowCount = 5,
  className,
}: SurfaceSkeletonProps) {
  return (
    <div className={className} style={ROOT} aria-busy="true" data-surface-skeleton>
      <style>{`
        @keyframes surface-skel-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-surface-skeleton] [data-skel-shimmer] {
            animation-duration: 0s !important;
          }
        }
      `}</style>
      {Array.from({ length: rowCount }, (_, i) => (
        <div key={i} style={ROW}>
          <div style={SHIMMER} data-skel-shimmer />
        </div>
      ))}
    </div>
  );
}
