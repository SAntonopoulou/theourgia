/**
 * SealedExcludedCallout — honesty note about sealed entries.
 *
 * Per `Theourgia Search.dc.html`. Editorial copy is rendered
 * verbatim per the project's wellbeing/copy rule. The card explains
 * why the server can't search sealed contents (the key never leaves
 * the device) and offers an "Unlock vault" affordance.
 *
 * Two layouts:
 *   - `compact` (default) — beside the results list.
 *   - `inline` — minimal one-liner used inside the empty-state card.
 *
 * Caller supplies the count via `sealedCount`. The component renders
 * "no sealed entries" honestly when count is 0.
 */

import { type CSSProperties, type ReactNode } from "react";

export type SealedExcludedLayout = "compact" | "inline";

export interface SealedExcludedCalloutProps {
  /** How many sealed entries were excluded from this result set. */
  sealedCount: number;
  layout?: SealedExcludedLayout;
  /** Render slot for the "Unlock vault" affordance. */
  unlockAction?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function LockGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={4.5} y={11} width={15} height={9} rx={2} />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </svg>
  );
}

function entrySingularOrPlural(n: number): string {
  return n === 1 ? "entry" : "entries";
}

function sealedTitle(count: number): string {
  if (count === 0) return "No sealed entries were excluded.";
  return `${count} sealed ${entrySingularOrPlural(count)} may also match.`;
}

const BODY =
  "Sealed entries are encrypted with a key only your device holds — the server can't read or search their contents, so they never appear in server results. Unlock the vault on this device to search inside them.";

export function SealedExcludedCallout({
  sealedCount,
  layout = "compact",
  unlockAction,
  className,
  style,
}: SealedExcludedCalloutProps) {
  if (layout === "inline") {
    return (
      <div
        className={className}
        data-component="sealed-excluded-callout"
        data-layout="inline"
        data-sealed-count={sealedCount}
        style={{
          display: "flex",
          gap: 13,
          alignItems: "flex-start",
          padding: "13px 15px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg-2)",
          ...style,
        }}
      >
        <span style={{ color: "var(--ink-soft)", flex: "none", marginTop: 1 }}>
          <LockGlyph size={17} />
        </span>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--ink-mute)",
          }}
        >
          {sealedCount === 0
            ? "No sealed entries were excluded — every searchable entry is in the results."
            : `${sealedCount} sealed ${entrySingularOrPlural(sealedCount)} weren't searched — their contents are encrypted. Unlock the vault to search inside them.`}
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      data-component="sealed-excluded-callout"
      data-layout="compact"
      data-sealed-count={sealedCount}
      style={{
        display: "flex",
        gap: 13,
        alignItems: "flex-start",
        padding: "15px 17px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          flex: "none",
          borderRadius: 8,
          background: "var(--bg-3)",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-soft)",
        }}
      >
        <LockGlyph />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            color: "var(--ink)",
          }}
        >
          {sealedTitle(sealedCount)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--ink-mute)",
            marginTop: 2,
          }}
        >
          {BODY}
        </div>
        {sealedCount > 0 && unlockAction ? (
          <div style={{ marginTop: 10 }}>{unlockAction}</div>
        ) : null}
      </div>
    </div>
  );
}
