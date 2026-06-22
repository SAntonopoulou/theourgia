/**
 * TarotHistoryRow — single row in the Tarot history view.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 192-200. Anchor with:
 *   • Date (display 13px ink-mute, fixed 84px column)
 *   • Title + cards line (display + ui, truncated)
 *   • Spread pill (right)
 */

import { type CSSProperties } from "react";

export interface TarotHistoryRowProps {
  /** Date string in the practitioner's locale (caller formats). */
  date: string;
  /** The reading's auto-title or user-edited title. */
  title: string;
  /** Cards in order, comma-separated by middle dot ("Past · Present · Future"). */
  cardsLine: string;
  /** Spread label (e.g. "Three-card", "Celtic Cross"). */
  spreadLabel: string;
  href?: string;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function TarotHistoryRow({
  date,
  title,
  cardsLine,
  spreadLabel,
  href,
  onSelect,
  className,
  style,
}: TarotHistoryRowProps) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      {...(href ? { href } : { type: "button" as const })}
      onClick={onSelect}
      data-component="tarot-history-row"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        textDecoration: "none",
        color: "var(--ink)",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        ...style,
      }}
    >
      <span
        data-date
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          color: "var(--ink-mute)",
          width: 84,
          flex: "none",
        }}
      >
        {date}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-mute)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cardsLine}
        </div>
      </div>
      <span
        data-spread-pill
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-soft)",
          padding: "3px 10px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-pill, 20px)",
          flex: "none",
        }}
      >
        {spreadLabel}
      </span>
    </Tag>
  );
}
