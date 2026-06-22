/**
 * BookStatusBadge — small pill showing a book's status.
 *
 * Per `Theourgia Library.dc.html`. Ink color comes from the `--st-*`
 * token for the status; the pill itself sits on `--bg-sunk` with a
 * subtle line border. No raw colors — every value resolves through
 * a token.
 */

import { type CSSProperties } from "react";

import { BOOK_STATUS_META, type BookStatus } from "./library.js";

export interface BookStatusBadgeProps {
  status: BookStatus;
  /** Override the displayed label (defaults to canonical). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function BookStatusBadge({
  status,
  label,
  className,
  style,
}: BookStatusBadgeProps) {
  const meta = BOOK_STATUS_META[status];
  return (
    <span
      className={className}
      data-component="book-status-badge"
      data-status={status}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        letterSpacing: "0.02em",
        color: meta.color,
        padding: "2px 9px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: 999,
        background: "var(--bg-sunk)",
        ...style,
      }}
    >
      {label ?? meta.label}
    </span>
  );
}
