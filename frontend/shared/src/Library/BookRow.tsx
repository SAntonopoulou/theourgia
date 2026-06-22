/**
 * BookRow — one row in the Library catalog.
 *
 * Per `Theourgia Library.dc.html`. The spine on the left carries the
 * tradition's color tint and a single glyph; the title (italic
 * display), byline, and a meta row of status badge + language chips
 * + holding hint fill the middle; the citation count sits on the
 * right.
 *
 * Composes `BookStatusBadge`. The select checkbox is shown when
 * `onToggleSelect` is provided; surfaces use this for the bulk
 * export selection bar.
 */

import { type CSSProperties, type ReactNode } from "react";

import { BookStatusBadge } from "./BookStatusBadge.js";
import { type LibraryBook, traditionSpineColor } from "./library.js";

export interface BookRowProps {
  book: LibraryBook;
  selected?: boolean;
  onToggleSelect?: (next: boolean) => void;
  onOpen?: () => void;
  /** Map ISO language codes to a human label ("grc" → "Greek"). */
  languageLabel?: (lang: string) => string;
  /** Optional first-row separator suppression (when row #0). */
  isFirstRow?: boolean;
  className?: string;
  style?: CSSProperties;
}

function HoldingIcon({ holding }: { holding: LibraryBook["holding"] }) {
  if (holding === "physical") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path d="M6 4h9l3 3v13H6z M9 4v16" />
      </svg>
    );
  }
  if (holding === "digital") {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <rect x={4} y={5} width={16} height={12} rx={1.5} />
        <path d="M9 21h6 M12 17v4" />
      </svg>
    );
  }
  return null;
}

function holdingLabel(book: LibraryBook): string {
  if (book.holding === "physical") {
    return book.shelf && book.shelf !== "—" ? book.shelf : "Physical";
  }
  if (book.holding === "digital") return "Digital";
  return "Not held";
}

export function BookRow({
  book,
  selected = false,
  onToggleSelect,
  onOpen,
  languageLabel,
  isFirstRow = false,
  className,
  style,
}: BookRowProps) {
  const spineColor = traditionSpineColor(book.tradition);
  const labelFor = (code: string) => languageLabel?.(code) ?? code;

  return (
    <div
      className={className}
      data-component="book-row"
      data-book-id={book.id}
      data-book-tradition={book.tradition}
      data-book-status={book.status}
      data-selected={selected ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 14px",
        borderTop: isFirstRow ? "none" : "1px solid var(--line)",
        background: selected ? "var(--bg-3)" : "transparent",
        transition: "background 0.15s ease",
        ...style,
      }}
    >
      {onToggleSelect ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${book.title}`}
          onClick={() => onToggleSelect(!selected)}
          data-book-checkbox
          style={{
            width: 22,
            height: 22,
            flex: "none",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: selected ? "var(--accent)" : "var(--line-2)",
            background: selected ? "var(--accent)" : "transparent",
            cursor: "pointer",
            transition: "all 0.15s ease",
            padding: 0,
          }}
        >
          {selected ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5l4.5 4.5L19 6.5" />
            </svg>
          ) : null}
        </button>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        data-book-open
        style={{
          display: "flex",
          gap: 15,
          alignItems: "stretch",
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: onOpen ? "pointer" : "default",
          color: "var(--ink)",
        }}
      >
        <span
          aria-hidden="true"
          data-book-spine
          style={{
            width: 42,
            height: 56,
            flex: "none",
            borderRadius: 3,
            background: spineColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-glyph)",
              fontSize: 17,
              color: "rgba(255, 255, 255, 0.82)",
            }}
          >
            {book.glyph}
          </span>
        </span>
        <span style={{ minWidth: 0, flex: 1, display: "block" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: 17.5,
              lineHeight: 1.2,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {book.title}
          </span>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              margin: "3px 0 7px",
            }}
          >
            {book.author} · {book.year}
          </span>
          <span
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <BookStatusBadge status={book.status} />
            {book.languages.map((lang) => (
              <LanguageChip
                key={lang}
                code={lang}
                label={labelFor(lang)}
              />
            ))}
            <span
              data-holding={book.holding}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              <HoldingIcon holding={book.holding} />
              {holdingLabel(book)}
            </span>
          </span>
        </span>
      </button>

      <span
        data-book-citations
        style={{
          textAlign: "right",
          flex: "none",
          alignSelf: "center",
        }}
      >
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--accent)",
          }}
        >
          {book.citations}
        </span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            color: "var(--ink-mute)",
          }}
        >
          cited
        </span>
      </span>
    </div>
  );
}

function LanguageChip({ code, label }: { code: string; label: ReactNode }) {
  return (
    <span
      data-language={code}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        color: "var(--ink-mute)",
        padding: "2px 7px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}
