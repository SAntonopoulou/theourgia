/**
 * AwaitingJudgmentQueue — workings whose covenant is sealed but whose
 * judgment is still open. Oldest first (server order), each row with
 * the declared date, title, two gate pips and its age in days.
 *
 * The record does not quietly forget an unfinished verdict.
 */

import type { CSSProperties } from "react";

import type { AwaitingJudgmentRead, GateResultWire } from "../api/types.js";
import { _, _n } from "../i18n/index.js";

export interface AwaitingJudgmentQueueProps {
  items: readonly AwaitingJudgmentRead[];
  onSelect?: (item: AwaitingJudgmentRead) => void;
  /** Currently open working, highlighted. */
  selectedId?: string | null;
  className?: string;
  style?: CSSProperties;
}

const PIP_TONES: Record<GateResultWire, { color: string; soft: string }> = {
  pass: { color: "var(--gate-pass)", soft: "var(--gate-pass-soft)" },
  fail: { color: "var(--gate-fail)", soft: "var(--gate-fail-soft)" },
  open: { color: "var(--gate-open)", soft: "var(--gate-open-soft)" },
};

function GatePip({ n, result }: { n: 1 | 2; result: GateResultWire }) {
  const tone = PIP_TONES[result];
  return (
    <span
      data-gate-pip={n}
      data-result={result}
      title={_("Gate {n}: {result}", { n, result })}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: tone.color,
        background: tone.soft,
        color: tone.color,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
      }}
    >
      {n}
    </span>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function AwaitingJudgmentQueue({
  items,
  onSelect,
  selectedId,
  className,
  style,
}: AwaitingJudgmentQueueProps) {
  if (items.length === 0) {
    return (
      <div
        data-component="awaiting-judgment-queue"
        data-empty
        className={className}
        style={{
          padding: "16px 18px",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md, 8px)",
          fontFamily: "var(--font-serif)",
          fontSize: 13.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
          ...style,
        }}
      >
        {_(
          "Nothing awaits judgment. A working joins this queue the moment its intent is sealed, and leaves it only when both gates are closed.",
        )}
      </div>
    );
  }
  return (
    <div
      data-component="awaiting-judgment-queue"
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}
    >
      {items.map((item) => {
        const selected = item.entry_id === selectedId;
        return (
          <button
            key={item.entry_id}
            type="button"
            data-queue-row={item.entry_id}
            aria-pressed={selected}
            onClick={() => onSelect?.(item)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              width: "100%",
              textAlign: "left",
              padding: "13px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: selected ? "var(--line-2)" : "var(--line)",
              borderRadius: "var(--r-md, 8px)",
              background: selected ? "var(--bg-3)" : "var(--bg-2)",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-mute)",
                flex: "none",
                width: 56,
              }}
            >
              {shortDate(item.declared_at)}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "none" }}>
              <GatePip n={1} result={item.gate1} />
              <GatePip n={2} result={item.gate2} />
            </span>
            <span
              data-age
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
                flex: "none",
              }}
            >
              {_n("{n} day", "{n} days", item.age_days, { n: item.age_days })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
