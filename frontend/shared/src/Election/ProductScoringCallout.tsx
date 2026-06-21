/**
 * ProductScoringCallout — load-bearing editorial explainer for the
 * Election Finder.
 *
 * Per `Theourgia Election Finder.dc.html`. The copy is rendered
 * verbatim because the practitioner needs to know the math:
 * scoring is multiplicative — one fail → zero, regardless of the
 * others. Influence weights only rank hours that pass *everything*.
 */

import { type CSSProperties } from "react";

export interface ProductScoringCalloutProps {
  className?: string;
  style?: CSSProperties;
}

function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth={1.5}
      style={{ flex: "none", marginTop: 1 }}
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 11v5M12 7.5v.5" />
    </svg>
  );
}

export function ProductScoringCallout({
  className,
  style,
}: ProductScoringCalloutProps) {
  return (
    <div
      className={className}
      data-component="product-scoring-callout"
      style={{
        display: "flex",
        gap: 11,
        padding: "13px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderLeftWidth: 3,
        borderLeftColor: "var(--accent)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent-soft)",
        ...style,
      }}
    >
      <InfoIcon />
      <div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink)",
            marginBottom: 2,
          }}
        >
          Every constraint is decisive.
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--ink-soft)",
          }}
        >
          Scoring is multiplicative — if one constraint fails, the
          hour scores{" "}
          <strong style={{ color: "var(--fail)" }}>zero</strong>,
          however many others pass. Influence weights only rank the
          hours that pass <em>everything</em>.
        </div>
      </div>
    </div>
  );
}
