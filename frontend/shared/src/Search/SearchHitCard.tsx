/**
 * SearchHitCard — one row in the search-results list.
 *
 * Per `Theourgia Search.dc.html`. Thumbnail or kind glyph on the
 * left, then the title (with hit highlighting), excerpt (also
 * highlighted), and a meta line — kind label · when · visibility
 * pill (color dot + label, using --vis-* tokens).
 */

import { type CSSProperties, type ReactNode } from "react";

import type { EntityVisibility } from "../api/types.js";
import { HighlightedText } from "./HighlightedText.js";

export interface SearchHit {
  id: string;
  /** Plain title text; hit highlighting is applied at render time. */
  title: string;
  /** Single-paragraph excerpt; hit highlighting is applied at render time. */
  excerpt: string;
  /** Pre-localised kind name ("Note", "Ritual log", "Dream"). */
  kindLabel: string;
  /** Free-text "when" line ("Mon 16 Jun · waxing crescent"). */
  when: string;
  visibility: EntityVisibility;
}

const VIS_DOT: Record<EntityVisibility, string> = {
  personal: "var(--vis-personal)",
  viewer: "var(--vis-viewer)",
  hub: "var(--vis-hub)",
  public: "var(--vis-public)",
};

const VIS_LABEL: Record<EntityVisibility, string> = {
  personal: "Personal",
  viewer: "Viewer",
  hub: "Hub",
  public: "Public",
};

export interface SearchHitCardProps {
  hit: SearchHit;
  /** Query whose hits should be highlighted. */
  query?: string;
  /** Render slot for a kind glyph (caller decides shape). */
  glyph?: ReactNode;
  onSelect?: () => void;
  className?: string;
  style?: CSSProperties;
}

function DefaultGlyphFrame({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 38,
        height: 38,
        flex: "none",
        borderRadius: "50%",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        background: "var(--bg-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-soft)",
        marginTop: 2,
      }}
    >
      {children}
    </span>
  );
}

export function SearchHitCard({
  hit,
  query,
  glyph,
  onSelect,
  className,
  style,
}: SearchHitCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      data-component="search-hit-card"
      data-hit-id={hit.id}
      data-visibility={hit.visibility}
      style={{
        display: "flex",
        gap: 15,
        padding: "15px 14px",
        borderRadius: "var(--r-md, 8px)",
        textAlign: "left",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "transparent",
        background: "transparent",
        cursor: "pointer",
        width: "100%",
        color: "var(--ink)",
        ...style,
      }}
    >
      <DefaultGlyphFrame>{glyph}</DefaultGlyphFrame>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--ink)",
            lineHeight: 1.2,
          }}
        >
          <HighlightedText text={hit.title} query={query} />
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "5px 0 7px",
          }}
        >
          <HighlightedText text={hit.excerpt} query={query} />
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {hit.kindLabel}
          </span>
          <span
            aria-hidden="true"
            style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "var(--ink-mute)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {hit.when}
          </span>
          <span
            data-visibility-pill
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 999,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: VIS_DOT[hit.visibility],
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-soft)",
              }}
            >
              {VIS_LABEL[hit.visibility]}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}
