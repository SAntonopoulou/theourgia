/**
 * QuoteCard — display a quotation with its citation.
 *
 * Per `Theourgia Library.dc.html`. A `<figure>` with an accent-left
 * border carrying the quotation in display serif (with the original
 * language's `lang=` attribute), followed by a figcaption with the
 * citation, the language pill, and a "Use as citation" copy button.
 */

import { type CSSProperties } from "react";

import type { LibraryQuote } from "./library.js";

export interface QuoteCardProps {
  quote: LibraryQuote;
  /** Called when the user clicks "Use as citation"; receives the
   *  quote's citation key (the string to copy into a draft). */
  onUseAsCitation?: (citationKey: string) => void;
  className?: string;
  style?: CSSProperties;
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={9} y={9} width={11} height={11} rx={2} />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export function QuoteCard({
  quote,
  onUseAsCitation,
  className,
  style,
}: QuoteCardProps) {
  return (
    <figure
      className={className}
      data-component="quote-card"
      data-quote-id={quote.id}
      data-book-id={quote.bookId}
      data-language={quote.lang}
      style={{
        margin: 0,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderLeftWidth: 3,
        borderLeftColor: "var(--accent)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        padding: "18px 20px",
        ...style,
      }}
    >
      <blockquote
        lang={quote.lang}
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: 18,
          lineHeight: 1.5,
          color: "var(--ink)",
        }}
      >
        {quote.text}
      </blockquote>
      <figcaption
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 13,
          flexWrap: "wrap",
        }}
      >
        <span
          data-citation
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          {quote.cite}
          {quote.page && quote.page !== "—" ? ` · ${quote.page}` : ""}
        </span>
        <span
          data-language-pill
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            padding: "2px 8px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: 999,
          }}
        >
          {quote.langLabel}
        </span>
        {onUseAsCitation ? (
          <button
            type="button"
            onClick={() => onUseAsCitation(quote.citationKey)}
            data-use-citation
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <CopyIcon />
            Use as citation
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
