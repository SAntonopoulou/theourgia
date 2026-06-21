/**
 * FestivalDetail — selected-festival card.
 *
 * Per `Theourgia Calendar.dc.html`. A vertical tradition-color strip
 * along the top, a tinted circle with the festival glyph, the name +
 * date label, a small tradition pill, the description, a "Practice"
 * paragraph, then a "Sources" list of citations with their authority
 * badges.
 *
 * Composes `CitationKindBadge`. The editorial copy (name, label,
 * description, practice, sources) is the caller's responsibility —
 * `DEFAULT_FESTIVALS` in `defaultFestivals.ts` carries the designer's
 * starter set verbatim.
 */

import { type CSSProperties, type ReactNode } from "react";

import { CitationKindBadge } from "./CitationKindBadge.js";
import {
  CITATION_KINDS,
  FESTIVAL_TRADITIONS,
  type Festival,
} from "./festivals.js";

export interface FestivalDetailProps {
  festival: Festival;
  /** Render slot for a dismiss button (e.g., to return to "Today"). */
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
}

function DismissIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function FestivalDetail({
  festival,
  onDismiss,
  className,
  style,
}: FestivalDetailProps) {
  const tradition = FESTIVAL_TRADITIONS[festival.tradition];
  const color = tradition.color;
  const tint = `color-mix(in srgb, ${color} 20%, var(--bg-2))`;

  return (
    <div
      className={className}
      data-component="festival-detail"
      data-festival-id={festival.id}
      data-tradition={festival.tradition}
      style={{
        background: "var(--bg-2)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* tradition-color strip */}
      <div
        aria-hidden="true"
        data-color-strip
        style={{ height: 4, background: color }}
      />

      <div style={{ padding: "18px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: tint,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-glyph)",
              fontSize: 19,
              color,
              flex: "none",
            }}
          >
            {festival.glyph}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 21,
                lineHeight: 1.12,
              }}
            >
              {festival.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                marginTop: 2,
              }}
            >
              {festival.label}
            </div>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Back to today"
              style={{
                color: "var(--ink-mute)",
                flex: "none",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <DismissIcon />
            </button>
          ) : null}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: 999,
            margin: "6px 0 12px",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-soft)",
            }}
          >
            {tradition.name}
          </span>
        </div>

        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--ink)",
            margin: "0 0 12px",
          }}
        >
          {festival.description}
        </p>

        <SectionLabel>Practice</SectionLabel>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "0 0 16px",
          }}
        >
          {festival.practice}
        </p>

        <SectionLabel>Sources</SectionLabel>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 9,
          }}
        >
          {festival.sources.map((src, i) => {
            const km = CITATION_KINDS[src.kind];
            return (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <CitationKindBadge kind={src.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ fontStyle: "italic" }}>{src.title}</span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {src.author} · {src.year}
                    {src.loc ? ` · ${src.loc}` : ""}
                  </div>
                  {src.note ? (
                    <div
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                        marginTop: 2,
                      }}
                    >
                      {src.note}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: km.color,
                      marginTop: 3,
                    }}
                  >
                    {km.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--ink-mute)",
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}
