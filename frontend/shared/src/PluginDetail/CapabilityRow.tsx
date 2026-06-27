/**
 * CapabilityRow — shared primitive across H09 surfaces 2, 3,
 * 8, 17.
 *
 * Renders one capability the plugin holds or is requesting:
 * label (plain English) + wire key (`--font-mono` `--network`
 * chip) + one-line consequence helper.
 */

import type { CSSProperties } from "react";

export interface CapabilityRowData {
  /** Plain-English label, e.g. "Read all your journal entries". */
  label: string;
  /** Wire key, e.g. ``read.entries``. Rendered next to the label. */
  wireKey: string;
  /** One-line consequence helper text. */
  consequence: string;
}

export interface CapabilityRowProps extends CapabilityRowData {
  /** When true, the row uses `--warn-soft` chrome — used for
   *  newly-requested capabilities in update flows (rule 31). */
  emphasised?: boolean;
  style?: CSSProperties;
}

export function CapabilityRow({
  label,
  wireKey,
  consequence,
  emphasised = false,
  style,
}: CapabilityRowProps) {
  return (
    <div
      data-capability-key={wireKey}
      data-emphasised={emphasised}
      style={{
        padding: "13px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: emphasised ? "var(--warn-border)" : "var(--line)",
        borderRadius: "var(--r-md)",
        background: emphasised ? "var(--warn-soft)" : "var(--bg-2)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <span
          data-field="capability-label"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink)",
          }}
        >
          {label}
        </span>
        <span
          data-field="capability-wire-key"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--network)",
            padding: "1px 7px",
            borderRadius: "var(--r-sm)",
            background: "var(--network-soft)",
          }}
        >
          {wireKey}
        </span>
      </div>
      <div
        data-field="capability-consequence"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        {consequence}
      </div>
    </div>
  );
}
