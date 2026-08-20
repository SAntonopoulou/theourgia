/**
 * The library of written rites — the web reading of what the phone's Rituals
 * screen holds.
 *
 * A rite is written on the phone (one field, marked up as you type — see
 * `parseRite`) and crosses in the record sync; here it is read. The list on the
 * left is the library; the panel on the right is the chosen rite, set as it is
 * performed. On a narrow screen the two stack.
 */

import { type CSSProperties, useState } from "react";

import type { Rite } from "./recordRites.js";
import { RiteScriptView } from "./RiteScriptView.js";

export interface RitesLibraryProps {
  rites: readonly Rite[];
  /** Shown when there are no rites — e.g. before the phone has synced. */
  emptyMessage?: string;
  className?: string;
  style?: CSSProperties;
}

const CARD_BASE: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  cursor: "pointer",
  marginBottom: 8,
};

const CARD_ACTIVE: CSSProperties = {
  ...CARD_BASE,
  borderColor: "var(--accent)",
  boxShadow: "inset 2px 0 0 var(--accent)",
};

export function RitesLibrary({ rites, emptyMessage, className, style }: RitesLibraryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(rites[0]?.id ?? null);

  if (rites.length === 0) {
    return (
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
          maxWidth: 460,
          ...style,
        }}
      >
        {emptyMessage ??
          "The rites you have written will appear here once your phone syncs. Link it under Settings to bring them across."}
      </p>
    );
  }

  const selected = rites.find((r) => r.id === selectedId) ?? rites[0];

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 300px) 1fr",
        gap: 24,
        alignItems: "start",
        ...style,
      }}
    >
      <nav aria-label="Your rites" style={{ minWidth: 0 }}>
        {rites.map((rite) => {
          const isActive = rite.id === selected?.id;
          return (
            <button
              key={rite.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => setSelectedId(rite.id)}
              style={isActive ? CARD_ACTIVE : CARD_BASE}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display, var(--font-serif))",
                  fontSize: 15.5,
                }}
              >
                {rite.name || "Untitled rite"}
              </span>
              {rite.summary ? (
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-soft)",
                    marginTop: 2,
                  }}
                >
                  {rite.summary}
                </span>
              ) : null}
              {rite.hasTraditionTiming ? (
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-mute)",
                    marginTop: 6,
                  }}
                >
                  Tradition timing
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {selected ? (
        <article style={{ minWidth: 0 }}>
          <h2
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 22,
              margin: "0 0 2px",
              color: "var(--ink)",
            }}
          >
            {selected.name || "Untitled rite"}
          </h2>
          {selected.summary ? (
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                margin: "0 0 12px",
              }}
            >
              {selected.summary}
            </p>
          ) : null}
          <RiteScriptView script={selected.script} emptyMessage="This rite has no words yet." />
        </article>
      ) : null}
    </div>
  );
}
