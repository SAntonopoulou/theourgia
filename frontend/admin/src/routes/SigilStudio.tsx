/**
 * Sigil Studio — three-pane workshop.
 *
 * Composition tracks ``Theourgia Sigil Studio.dc.html``:
 *   Topbar  · "Sigil Studio" + method/planet/hour subtitle + "Save sigil"
 *             primary action (disabled until the persistence model lands).
 *   Left    · Statement of intent · Method (Kamea / Rose Cross / Letter
 *             elimination / Free-hand) · Planetary square · Reduced
 *             letters tally.
 *   Center  · Kamea-grid SVG canvas with the example sigil drawn in,
 *             plus a small drawing-toolbar.
 *   Right   · Title field · Working tag · Correspondences · Visibility ·
 *             Charge & archive · Export.
 *
 * All buttons are static scaffolding for now. Persistence model + the
 * ``kamea`` / ``traceSigil`` engines from agent_data_and_components §10
 * ship in a later batch.
 */

import { useTopbar } from "@theourgia/shared";

// ─── Topbar action ──────────────────────────────────────────────────────────

function SaveSigilButton() {
  return (
    <button
      type="button"
      disabled
      style={{
        padding: "9px 16px",
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
      title="Save lights up when the sigil model ships."
    >
      Save sigil
    </button>
  );
}

// ─── Left pane: method ──────────────────────────────────────────────────────

function MethodPane() {
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 10,
  };

  const methodButtonStyle = (selected: boolean): React.CSSProperties => ({
    padding: "7px 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
    borderRadius: "var(--r-md, 8px)",
    cursor: "pointer",
  });

  const planetButtonStyle = (selected: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "50%",
    color: selected ? "var(--accent)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    fontFamily: "var(--font-glyph, var(--font-serif))",
    fontSize: 18,
    cursor: "pointer",
  });

  const planets: { glyph: string; selected: boolean }[] = [
    { glyph: "♄", selected: true },
    { glyph: "♃", selected: false },
    { glyph: "♂", selected: false },
    { glyph: "☉", selected: false },
    { glyph: "♀", selected: false },
    { glyph: "☿", selected: false },
    { glyph: "☽", selected: false },
  ];

  return (
    <div
      className="scroll"
      style={{
        flex: "1 1 290px",
        minWidth: 0,
        borderRight: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: "22px 20px",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div style={sectionLabel}>Statement of intent</div>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          padding: "13px 14px",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 17,
          lineHeight: 1.45,
          color: "var(--ink)",
        }}
      >
        It is my Will to walk unseen.
      </div>

      <div style={{ ...sectionLabel, margin: "22px 0 10px" }}>Method</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button type="button" style={methodButtonStyle(true)}>
          Kamea
        </button>
        <button type="button" style={methodButtonStyle(false)}>
          Rose Cross
        </button>
        <button type="button" style={methodButtonStyle(false)}>
          Letter elimination
        </button>
        <button type="button" style={methodButtonStyle(false)}>
          Free-hand
        </button>
      </div>

      <div style={{ ...sectionLabel, margin: "22px 0 10px" }}>Planetary square</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {planets.map((p, i) => (
          <button
            type="button"
            key={`planet-${i}-${p.glyph}`}
            style={planetButtonStyle(p.selected)}
            aria-label={`Planet ${p.glyph}`}
          >
            {p.glyph}
          </button>
        ))}
      </div>

      <div style={{ ...sectionLabel, margin: "22px 0 10px" }}>Reduced letters</div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        {["T", "S", "M", "Y", "W", "L", "K", "N"].map((c) => (
          <span
            key={`letter-${c}`}
            style={{
              padding: "4px 9px",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-sm, 4px)",
              color: "var(--ink)",
            }}
          >
            {c}
          </span>
        ))}
        {["I", "U", "E", "A"].map((c) => (
          <span
            key={`letter-strike-${c}`}
            style={{
              padding: "4px 9px",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm, 4px)",
              color: "var(--ink-mute)",
              textDecoration: "line-through",
            }}
          >
            {c}
          </span>
        ))}
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginTop: 10,
        }}
      >
        8 unique letters · path value{" "}
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>45 → 9</span>
      </div>
    </div>
  );
}

// ─── Center pane: canvas ────────────────────────────────────────────────────

function CanvasPane() {
  const toolButtonStyle = (selected: boolean): React.CSSProperties => ({
    width: 38,
    height: 38,
    border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
    borderRadius: "var(--r-md, 8px)",
    background: selected ? "var(--accent-soft)" : "var(--bg-2)",
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  });

  return (
    <div
      style={{
        flex: "2 1 420px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "radial-gradient(ellipse at 50% 42%, var(--bg-2), var(--bg) 76%)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
        }}
      >
        {/* Faithful port of the design's example sigil, drawn on a Saturn
            3×3 kamea (path 4→9→7→5→1→8→3). */}
        <svg
          viewBox="0 0 280 280"
          width="100%"
          style={{ maxWidth: 400, aspectRatio: "1" }}
          role="img"
          aria-label="Sigil constructed on the Saturn kamea"
        >
          <title>Sigil constructed on the Saturn kamea</title>
          <circle
            cx="140"
            cy="140"
            r="132"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.25"
          />
          <circle
            cx="140"
            cy="140"
            r="124"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="0.6"
            opacity="0.18"
          />
          <g stroke="var(--line-2)" strokeWidth="1" opacity="0.6">
            <line x1="20" y1="100" x2="260" y2="100" />
            <line x1="20" y1="180" x2="260" y2="180" />
            <line x1="100" y1="20" x2="100" y2="260" />
            <line x1="180" y1="20" x2="180" y2="260" />
          </g>
          <g
            fill="var(--ink-mute)"
            fontFamily="var(--font-mono)"
            fontSize="16"
            textAnchor="middle"
            opacity="0.55"
          >
            <text x="60" y="66">
              4
            </text>
            <text x="140" y="66">
              9
            </text>
            <text x="220" y="66">
              2
            </text>
            <text x="60" y="146">
              3
            </text>
            <text x="140" y="146">
              5
            </text>
            <text x="220" y="146">
              7
            </text>
            <text x="60" y="226">
              8
            </text>
            <text x="140" y="226">
              1
            </text>
            <text x="220" y="226">
              6
            </text>
          </g>
          <path
            className="sigil-line"
            d="M60 60 L140 60 L220 140 L140 140 L140 220 L60 220 L60 140"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="60" r="7" fill="none" stroke="var(--accent)" strokeWidth="3" />
          <line
            x1="50"
            y1="130"
            x2="70"
            y2="150"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g fill="var(--accent)">
            <circle cx="140" cy="60" r="3.4" />
            <circle cx="220" cy="140" r="3.4" />
            <circle cx="140" cy="140" r="3.4" />
            <circle cx="140" cy="220" r="3.4" />
            <circle cx="60" cy="220" r="3.4" />
          </g>
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 16,
          borderTop: "1px solid var(--line)",
        }}
      >
        <button type="button" aria-label="Pen" style={toolButtonStyle(true)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 19l2.5-.6L19 7a2 2 0 0 0-3-3L4.6 15.5 4 18z" />
          </svg>
        </button>
        <button type="button" aria-label="Line" style={toolButtonStyle(false)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 19L19 5" />
            <circle cx="5" cy="19" r="1.6" />
            <circle cx="19" cy="5" r="1.6" />
          </svg>
        </button>
        <button type="button" aria-label="Node" style={toolButtonStyle(false)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="9" opacity="0.4" />
          </svg>
        </button>
        <button type="button" aria-label="Smooth" style={toolButtonStyle(false)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 16c4 0 4-8 8-8s4 8 8 8" />
          </svg>
        </button>
        <span style={{ width: 1, height: 24, background: "var(--line)", margin: "0 4px" }} />
        <button type="button" aria-label="Undo" style={toolButtonStyle(false)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Right pane: properties ─────────────────────────────────────────────────

function PropertiesPane() {
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
    marginBottom: 8,
  };

  return (
    <div
      className="scroll"
      style={{
        flex: "1 1 280px",
        minWidth: 0,
        borderLeft: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: "22px 20px",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <div style={sectionLabel}>Title</div>
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          padding: "10px 12px",
          fontFamily: "var(--font-display, var(--font-serif))",
          fontSize: 17,
          marginBottom: 18,
        }}
      >
        Sigil of the Unseen Walk
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 18 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--c-working)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-soft)",
          }}
        >
          Working · Saturnine
        </span>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 12 }}>Correspondences</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 11,
          fontFamily: "var(--font-ui)",
          fontSize: 13.5,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "var(--ink-mute)" }}>Planet</span>
          <span style={{ marginLeft: "auto", color: "var(--ink)" }}>
            <span style={{ fontFamily: "var(--font-glyph, var(--font-serif))" }}>♄</span> Saturn · 3
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "var(--ink-mute)" }}>Intent</span>
          <span style={{ marginLeft: "auto", color: "var(--ink)" }}>Concealment · binding</span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "var(--ink-mute)" }}>Path value</span>
          <span
            style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--accent)" }}
          >
            45 → 9
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ color: "var(--ink-mute)" }}>Gematria</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
            נסתר · 720
          </span>
        </div>
      </div>

      <div style={{ ...sectionLabel, marginBottom: 10 }}>Visibility</div>
      <div
        style={{
          display: "flex",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          overflow: "hidden",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          marginBottom: 20,
        }}
      >
        <span style={{ padding: "7px 11px", color: "var(--ink-soft)" }}>Personal</span>
        <span
          style={{
            padding: "7px 11px",
            borderLeft: "1px solid var(--line)",
            background: "var(--accent-soft)",
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="1.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          Sealed
        </span>
      </div>

      <button
        type="button"
        disabled
        style={{
          width: "100%",
          padding: 11,
          borderRadius: "var(--r-md, 8px)",
          background: "var(--accent)",
          color: "var(--accent-ink, white)",
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: 13.5,
          marginBottom: 10,
          border: "none",
          cursor: "not-allowed",
          opacity: 0.7,
        }}
        title="Charge & archive ships with the sigil persistence model."
      >
        Charge &amp; archive
      </button>
      <button
        type="button"
        disabled
        style={{
          width: "100%",
          padding: 10,
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-md, 8px)",
          color: "var(--ink-mute)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          background: "transparent",
          cursor: "not-allowed",
        }}
        title="Export pending."
      >
        Export SVG / print
      </button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function SigilStudio() {
  useTopbar(
    () => ({
      title: "Sigil Studio",
      subtitle: "Construct by kamea · Saturn square · drawn in the Hour of Venus",
      after: <SaveSigilButton />,
    }),
    [],
  );

  return (
    <div
      style={{
        margin: "0 -28px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        minHeight: 0,
      }}
    >
      <MethodPane />
      <CanvasPane />
      <PropertiesPane />
    </div>
  );
}
