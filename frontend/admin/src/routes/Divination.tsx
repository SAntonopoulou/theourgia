/**
 * Divination Workbench.
 *
 * Composition tracks ``Theourgia Divination.dc.html``:
 *   Topbar  · "Divination Workbench" title; subtitle is the current
 *             planetary hour + lunar-phase line ("a fit hour for the art"
 *             reads as long as the design's narrative copy stands).
 *   Tabs    · Tarot · I Ching · Geomancy · Runes · Scrying.
 *   Stages  · Per-tool view. Tarot ships with an empty felt-radial table
 *             (engine pending). The other four render the design's altar
 *             card with Configure + Cast buttons.
 *
 * The casting engines (``ichingCast`` / ``geomancyCast`` / shuffle +
 * deal + interpret for tarot) ship per ``agent_data_and_components §10``
 * and are not in this batch — the stages render as honest scaffolding so
 * the chrome and motion match the design.
 */

import { type Planet, useCelestial, useSession, useTopbar } from "@theourgia/shared";
import { useState } from "react";

import { useMyLocation } from "../data/useLocation.js";
import { MOCK_LOCATION } from "../mocks/today.js";

// ─── Tools ──────────────────────────────────────────────────────────────────

type Tool = "tarot" | "iching" | "geomancy" | "runes" | "scrying";

const TOOLS: { key: Tool; label: string }[] = [
  { key: "tarot", label: "Tarot" },
  { key: "iching", label: "I Ching" },
  { key: "geomancy", label: "Geomancy" },
  { key: "runes", label: "Runes" },
  { key: "scrying", label: "Scrying" },
];

const TOOL_META: Record<Exclude<Tool, "tarot">, { glyph: string; name: string; desc: string }> = {
  iching: {
    glyph: "䷂",
    name: "I Ching",
    desc: "Cast the coins or yarrow stalks. The Book of Changes answers with a hexagram, its changing lines, and the moving judgment.",
  },
  geomancy: {
    glyph: "☷",
    name: "Geomancy",
    desc: "Generate the four Mothers from random marks; the figures cascade into Daughters, Nieces, Witnesses, and the Judge.",
  },
  runes: {
    glyph: "ᚠ",
    name: "Runes",
    desc: "Draw from the pouch of the Elder Futhark. Each stave is read in its house, upright or merkstave.",
  },
  scrying: {
    glyph: "◉",
    name: "Scrying",
    desc: "Enter a darkened field for speculum, crystal, or black mirror work. Sessions log to Trance mode with an ambient timer.",
  },
};

// ─── Planet labels (for the topbar subtitle) ────────────────────────────────

const PLANET_LABEL: Record<Planet, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
};

// ─── Tool tabs ──────────────────────────────────────────────────────────────

function ToolTabs({ active, onChange }: { active: Tool; onChange: (t: Tool) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Divination tool"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "0 28px",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
      }}
    >
      {TOOLS.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "13px 16px",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: selected ? "var(--ink)" : "var(--ink-mute)",
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${selected ? "var(--accent)" : "transparent"}`,
              marginBottom: -1,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Tarot stage ────────────────────────────────────────────────────────────

function TarotStage() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        gap: 0,
        minHeight: 560,
      }}
    >
      <div
        style={{
          flex: "2 1 520px",
          minWidth: 0,
          background:
            "radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--felt) 78%, transparent), var(--bg) 78%)",
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Spread — Past · Present · Future
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            Deck pending · draw to begin
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            flexWrap: "wrap",
            padding: "18px 0",
          }}
        >
          {[0, 1, 2].map((i) => (
            <EmptyCardSlot key={`card-${i}`} highlight={i === 1} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md, 8px)",
              overflow: "hidden",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
            }}
          >
            <span
              style={{ padding: "8px 13px", background: "var(--accent-soft)", color: "var(--ink)" }}
            >
              Past · Present · Future
            </span>
            <span
              style={{
                padding: "8px 13px",
                borderLeft: "1px solid var(--line)",
                color: "var(--ink-soft)",
              }}
            >
              Celtic Cross
            </span>
            <span
              style={{
                padding: "8px 13px",
                borderLeft: "1px solid var(--line)",
                color: "var(--ink-soft)",
              }}
            >
              Single card
            </span>
          </div>
          <button
            type="button"
            disabled
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 15px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md, 8px)",
              background: "transparent",
              color: "var(--ink-mute)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: "not-allowed",
            }}
            title="Shuffle wires up with the tarot engine."
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 8h13l-3-3M21 16H8l3 3" />
            </svg>
            Shuffle
          </button>
          <button
            type="button"
            disabled
            style={{
              padding: "9px 18px",
              borderRadius: "var(--r-md, 8px)",
              background: "var(--accent)",
              color: "var(--accent-ink, white)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: "not-allowed",
              opacity: 0.7,
            }}
            title="Draw wires up with the tarot engine."
          >
            Draw
          </button>
        </div>
      </div>

      {/* Interpretation column */}
      <div
        className="scroll"
        style={{
          flex: "1 1 320px",
          minWidth: 0,
          borderLeft: "1px solid var(--line)",
          background: "var(--bg-2)",
          padding: "26px 24px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--c-divination)",
            marginBottom: 8,
          }}
        >
          Present
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 30,
            margin: "0 0 4px",
          }}
        >
          —
        </h2>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 15,
            color: "var(--ink-mute)",
            marginBottom: 18,
          }}
        >
          Draw a card to see its attributions and interpretation.
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15.5,
            lineHeight: 1.62,
            color: "var(--ink-soft)",
            margin: 0,
          }}
        >
          Each casting will be timestamped with the planetary hour and may be saved to the journal.
          The interpretation engine wires the card's astrological attribution, Hebrew path, element,
          and sephirotic position from the canonical Thoth table.
        </p>
      </div>
    </div>
  );
}

function EmptyCardSlot({ highlight }: { highlight: boolean }) {
  const w = highlight ? 158 : 150;
  const h = highlight ? 240 : 228;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: w,
          height: h,
          borderRadius: 8,
          background: "color-mix(in srgb, var(--felt) 80%, transparent)",
          border: `1px dashed ${highlight ? "var(--accent)" : "var(--line-2)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-mute)",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 28,
          transform: highlight ? "translateY(-8px)" : undefined,
          boxShadow: highlight ? "0 0 0 3px var(--accent-soft)" : undefined,
        }}
        aria-hidden="true"
      >
        ✶
      </div>
    </div>
  );
}

// ─── Generic "altar" stage (I Ching / Geomancy / Runes / Scrying) ──────────

function AltarStage({ tool }: { tool: Exclude<Tool, "tarot"> }) {
  const m = TOOL_META[tool];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: 560,
        padding: "48px 28px",
        background:
          "radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--felt) 70%, transparent), var(--bg) 76%)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-glyph, var(--font-serif))",
          fontSize: 72,
          color: "var(--accent)",
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {m.glyph}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 34,
          margin: "0 0 10px",
        }}
      >
        {m.name}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 17,
          lineHeight: 1.6,
          color: "var(--ink-soft)",
          maxWidth: "46ch",
          margin: "0 0 26px",
        }}
      >
        {m.desc}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-md, 8px)",
            background: "transparent",
            color: "var(--ink-mute)",
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            cursor: "not-allowed",
          }}
          title="Configure wires up with the casting engine."
        >
          Configure
        </button>
        <button
          type="button"
          disabled
          style={{
            padding: "11px 24px",
            borderRadius: "var(--r-md, 8px)",
            background: "var(--accent)",
            color: "var(--accent-ink, white)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "not-allowed",
            opacity: 0.7,
          }}
          title={`${m.name} engine ships per agent_data_and_components §10.`}
        >
          Cast {m.name}
        </button>
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        Each casting will be timestamped with the planetary hour and saved to your record.
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Divination() {
  const session = useSession();
  const locationCall = useMyLocation({ enabled: session !== null });
  const location = locationCall.data ?? MOCK_LOCATION;
  const celestial = useCelestial({ lat: location.lat, lng: location.lng });
  const [tool, setTool] = useState<Tool>("tarot");

  const hourLabel = PLANET_LABEL[celestial.planetary.ruler];
  const subtitleKey = `${hourLabel}|${celestial.lunarPhaseName}`;
  useTopbar(
    () => ({
      title: "Divination Workbench",
      subtitle: (
        <>
          <span aria-hidden="true" style={{ fontFamily: "var(--font-glyph, var(--font-serif))" }}>
            ☽
          </span>{" "}
          Hour of {hourLabel} · {celestial.lunarPhaseLabel.toLowerCase()} — a fit hour for the art
        </>
      ),
    }),
    [subtitleKey],
  );

  return (
    <div style={{ margin: "0 -28px" }}>
      {/* The page lives flush with the topbar — the tool tabs are full-width
          and don't share the inner content padding. We pull negative margins
          to undo AppShell's main padding. */}
      <ToolTabs active={tool} onChange={setTool} />
      {tool === "tarot" ? <TarotStage /> : <AltarStage tool={tool} />}
    </div>
  );
}
