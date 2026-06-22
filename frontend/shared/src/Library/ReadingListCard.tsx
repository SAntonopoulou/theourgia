/**
 * ReadingListCard — picker tile for a reading list.
 *
 * Per `Theourgia Library.dc.html`. Each tile is a button showing the
 * list name + optional "Public" pill, a free-text progress label
 * line, and a progress bar in `--c-synchronicity` (the "lasting
 * progress" colour from the Phase 02 palette).
 *
 * The active tile is outlined in `--accent`.
 */

import { type CSSProperties } from "react";

import {
  type ReadingListSummary,
  readingListProgress,
} from "./library.js";

export interface ReadingListCardProps {
  list: ReadingListSummary;
  active?: boolean;
  onSelect?: () => void;
  /** Override the progress label (e.g. "5 of 5 read"). */
  progressLabel?: string;
  className?: string;
  style?: CSSProperties;
}

function defaultProgressLabel(list: ReadingListSummary): string {
  if (list.total === 0) return "Empty list";
  if (list.read === list.total) return `${list.total} of ${list.total} read`;
  const reading = list.reading > 0 ? ` · ${list.reading} reading` : "";
  return `${list.read} of ${list.total} read${reading}`;
}

export function ReadingListCard({
  list,
  active = false,
  onSelect,
  progressLabel,
  className,
  style,
}: ReadingListCardProps) {
  const pct = Math.round(readingListProgress(list) * 100);
  const label =
    progressLabel ?? list.progressLabel ?? defaultProgressLabel(list);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="reading-list-card"
      data-list-id={list.id}
      data-active={active ? "true" : "false"}
      data-published={list.published ? "true" : "false"}
      aria-current={active ? "true" : "false"}
      style={{
        padding: "13px 15px",
        textAlign: "left",
        borderRadius: "var(--r-md, 8px)",
        background: active ? "var(--bg-3)" : "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: active ? "var(--accent)" : "var(--line)",
        color: "var(--ink)",
        cursor: "pointer",
        display: "block",
        width: "100%",
        ...style,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16.5,
            color: "var(--ink)",
          }}
        >
          {list.name}
        </span>
        {list.published ? (
          <span
            data-public-pill
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 9.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--c-synchronicity)",
              padding: "1px 7px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: 999,
            }}
          >
            Public
          </span>
        ) : null}
      </span>
      <span
        data-progress-label
        style={{
          display: "block",
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          margin: "7px 0 9px",
        }}
      >
        {label}
      </span>
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          display: "block",
          height: 5,
          borderRadius: 3,
          background: "var(--bg-sunk)",
          overflow: "hidden",
        }}
      >
        <span
          data-progress-fill
          style={{
            display: "block",
            height: "100%",
            width: `${pct}%`,
            background: "var(--c-synchronicity)",
            transition: "width 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
