/**
 * DeckPicker — deck selection button.
 *
 * Verbatim from `Theourgia Tarot.dc.html` lines 106-110. Renders as
 * a single button (the picker dropdown is deferred to the surface
 * once multiple decks ship via the Plugin Ecosystem). For the
 * Rider–Waite–Smith default it shows the "public domain" chip.
 *
 * Per H04 §S7.3 + Gotcha: one active deck at a time, switched
 * BETWEEN sessions — not mid-spread.
 */

import { type CSSProperties } from "react";

export interface DeckPickerProps {
  /** Display name of the active deck. Default RWS. */
  deckName?: string;
  /** When true, render the small "public domain" attribution chip. */
  isPublicDomain?: boolean;
  /** Called when the picker is clicked (the parent opens the
   *  switcher modal; not in scope for this component). */
  onPick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const STAR = (
  <span
    style={{
      fontFamily: "var(--font-glyph)",
      color: "var(--accent)",
    }}
    aria-hidden="true"
  >
    ✦
  </span>
);

const CARET = (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function DeckPicker({
  deckName = "Rider–Waite–Smith",
  isPublicDomain = true,
  onPick,
  className,
  style,
}: DeckPickerProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      data-component="deck-picker"
      data-deck={deckName}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 13px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ink-soft)",
        cursor: onPick ? "pointer" : "default",
        ...style,
      }}
    >
      {STAR}
      {deckName}
      {isPublicDomain ? (
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            color: "var(--ink-mute)",
            paddingLeft: 4,
            borderLeftWidth: 1,
            borderLeftStyle: "solid",
            borderLeftColor: "var(--line)",
            marginLeft: 2,
          }}
        >
          public domain
        </span>
      ) : null}
      {CARET}
    </button>
  );
}
