/**
 * SealedExportNotice — honesty card for the Export surface.
 *
 * Per `Theourgia Export.dc.html`. Editorial copy is rendered verbatim:
 *   - heading: "Sealed entries are never exported"
 *   - body:    "N sealed [entry|entries] [is|are] set aside; unlock
 *               the vault to include them on this device." OR
 *              "No sealed entries in this selection."
 *
 * Distinct from `SealedExcludedCallout` (Search) — Search says "may
 * also match", Export says "never exported". Same wellbeing rule:
 * the user is told honestly what the system does and doesn't see.
 */

import { type CSSProperties } from "react";

export interface SealedExportNoticeProps {
  /** Number of sealed entries in the current selection. */
  sealedCount: number;
  className?: string;
  style?: CSSProperties;
}

function LockGlyph() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <rect x={5} y={11} width={14} height={9} rx={1.5} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function bodyFor(count: number): string {
  if (count === 0) return "No sealed entries in this selection.";
  const noun = count === 1 ? "entry" : "entries";
  const verb = count === 1 ? "is" : "are";
  return `${count} sealed ${noun} ${verb} set aside; unlock the vault to include them on this device.`;
}

export function SealedExportNotice({
  sealedCount,
  className,
  style,
}: SealedExportNoticeProps) {
  return (
    <div
      className={className}
      data-component="sealed-export-notice"
      data-sealed-count={sealedCount}
      style={{
        display: "flex",
        gap: 11,
        padding: "13px 15px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-sunk)",
        ...style,
      }}
    >
      <span
        style={{ flex: "none", color: "var(--ink-mute)", marginTop: 1 }}
      >
        <LockGlyph />
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink)",
            marginBottom: 2,
          }}
        >
          Sealed entries are never exported
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "var(--ink-mute)",
          }}
        >
          {bodyFor(sealedCount)}
        </div>
      </div>
    </div>
  );
}
