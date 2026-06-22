/**
 * EdgeKindLegend — sidebar legend listing the five alias edge kinds.
 *
 * Sits in the Aliases-surface rail beneath "Edge kinds". For each
 * `AliasEdgeKind` shows the directional glyph (→ for asymmetric, ↔ for
 * symmetric), the human label, and the short description from
 * `ALIAS_EDGE_KINDS`.
 *
 * Per Theourgia Aliases.dc.html lines 171–176.
 */

import { type CSSProperties } from "react";

import {
  ALIAS_EDGE_KINDS,
  type AliasEdgeKind,
} from "./AliasGraph.js";

const EDGE_KIND_ORDER_DEFAULT: readonly AliasEdgeKind[] = [
  "same-as",
  "aspect-of",
  "aspect-includes",
  "syncretic-with",
  "epithet-of",
];

export interface EdgeKindLegendProps {
  /** Override the order or subset of edge kinds shown. */
  kinds?: readonly AliasEdgeKind[];
  className?: string;
  style?: CSSProperties;
}

export function EdgeKindLegend({
  kinds = EDGE_KIND_ORDER_DEFAULT,
  className,
  style,
}: EdgeKindLegendProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
        ...style,
      }}
      data-component="edge-kind-legend"
    >
      {kinds.map((kind) => {
        const meta = ALIAS_EDGE_KINDS[kind];
        const arrow = meta.symmetric ? "↔" : "→";
        return (
          <div key={kind} data-edge-kind={kind}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink)",
              }}
            >
              <span
                data-edge-arrow
                style={{ color: "var(--edge)", display: "flex" }}
              >
                {arrow}
              </span>
              {meta.label}
            </div>
            <div
              data-edge-desc
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                lineHeight: 1.45,
                marginLeft: 24,
              }}
            >
              {meta.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { EDGE_KIND_ORDER_DEFAULT };
