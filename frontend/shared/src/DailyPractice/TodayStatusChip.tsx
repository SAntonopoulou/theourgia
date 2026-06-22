/**
 * TodayStatusChip — small status chip on the Today band.
 *
 * Verbatim from the mockup (lines 113-121 + 356). Border / status
 * label / status colour are status-driven; the per-practice icon
 * comes from PracticeStatusIcon.
 *
 *   done    → label "Kept",    accent text,  accent-soft border
 *   skipped → label "Skipped", --skip text,  --line border
 *   pending → label "Pending", ink-soft text, --line border
 */

import { type CSSProperties } from "react";

import type { TodayStatus } from "../practice/index.js";
import { TODAY_CHIP_LABEL } from "./copy.js";
import { PracticeStatusIcon } from "./PracticeStatusIcon.js";

const META: Record<
  TodayStatus,
  { color: string; border: string }
> = {
  done: { color: "var(--accent)", border: "var(--accent-soft)" },
  skipped: { color: "var(--skip)", border: "var(--line)" },
  pending: { color: "var(--ink-soft)", border: "var(--line)" },
};

export interface TodayStatusChipProps {
  /** Practice name shown bold on top. */
  name: string;
  status: TodayStatus;
  className?: string;
  style?: CSSProperties;
}

export function TodayStatusChip({
  name,
  status,
  className,
  style,
}: TodayStatusChipProps) {
  const meta = META[status];
  return (
    <div
      data-component="today-status-chip"
      data-status={status}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 13px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: meta.border,
        borderRadius: "var(--r-md)",
        background: "var(--bg)",
        minWidth: 0,
        ...style,
      }}
    >
      <span style={{ display: "flex", flex: "none" }}>
        <PracticeStatusIcon status={status} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: meta.color,
          }}
        >
          {TODAY_CHIP_LABEL[status]}
        </div>
      </div>
    </div>
  );
}
