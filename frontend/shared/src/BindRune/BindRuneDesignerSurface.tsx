/**
 * BindRuneDesignerSurface — the bind-rune designer (v1-007).
 *
 * FEATURES §4: "Runes — Elder Futhark, Younger Futhark, Anglo-Saxon
 * Futhorc, Armanen, Northumbrian; per-rune meanings; spreads incl.
 * bind-rune designer."
 *
 * Two-pane: rune-picker rail (rune row select + clickable rune grid,
 * hydrated from the bundled rune-set endpoints via the `loadRuneSets`
 * / `loadRuneSet` props) · main (stroke + stave + export toolbar,
 * SVG composition canvas, per-layer transform controls).
 *
 * HONEST v1 COMPOSITION APPROACH: deriving monoline stroke paths
 * from Unicode rune glyphs is not feasible without a font-outline
 * pipeline, so the canvas layers `<text>` elements set in the
 * `--font-rune` token face over an optional central vertical stave,
 * with per-rune rotation (0/90/180/270), mirroring, scale, and
 * opacity. The method note under the canvas says so.
 *
 * PERSISTENCE: none — deliberately. `Sigil.mode` is a closed
 * Postgres enum (`sigil_mode`) and this batch ships without a
 * migration, so the surface is client-side compose + "Download SVG"
 * only. Exported markup resolves the `--font-rune` / stroke tokens
 * to literal values so the file renders outside the app.
 */

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import {
  BR_COMPOSITION_EMPTY,
  BR_COMPOSITION_EYEBROW,
  BR_DOWNLOAD_FILENAME,
  BR_DOWNLOAD_SVG,
  BR_METHOD_NOTE,
  BR_MIRROR_LABEL,
  BR_OPACITY_LABEL,
  BR_RAIL_EYEBROW,
  BR_RAIL_HINT,
  BR_RAIL_SET_LABEL,
  BR_REMOVE_LABEL,
  BR_ROTATE_LABEL,
  BR_RUNE_FONT_STACK,
  BR_SCALE_LABEL,
  BR_STAVE_TOGGLE,
  BR_STROKE_LABEL,
  BR_STROKE_OPTIONS,
  BR_TOPBAR_SUBTITLE,
  BR_TOPBAR_TITLE,
  type BindRuneStrokeKey,
  bindRuneCanvasLabel,
} from "./copy.js";
import type {
  BindRuneGlyph,
  BindRuneLayer,
  BindRuneRotation,
  BindRuneSetDetail,
  BindRuneSetSummary,
} from "./types.js";

// ── Canvas geometry ────────────────────────────────────────────────

/** Fixed square canvas (SVG user units). */
const CANVAS_SIZE = 420;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const STAVE_TOP = 46;
const STAVE_BOTTOM = CANVAS_SIZE - 46;
const STAVE_WIDTH = 5;
/** Glyph em size at scale=1. */
const GLYPH_BASE_SIZE = 230;

// ── Styles ─────────────────────────────────────────────────────────

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "14px 28px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const PANES_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
};

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 260px",
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "18px 16px 40px",
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  padding: "22px 26px 50px",
};

const EYEBROW_STYLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  margin: "18px 0 8px",
};

const TOOLBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  marginBottom: 20,
};

const SEGMENT_GROUP_STYLE: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: 8,
  background: "var(--bg-2)",
};

const SEG_BASE: CSSProperties = {
  padding: "6px 14px",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  background: "transparent",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: 6,
  cursor: "pointer",
};

const SEG_ON: CSSProperties = {
  ...SEG_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

const GHOST_BUTTON: CSSProperties = {
  padding: "8px 14px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const PRIMARY_BUTTON: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
};

const RUNE_BUTTON_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 3,
  padding: "8px 2px 6px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  cursor: "pointer",
  minWidth: 0,
};

const LAYER_ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const RANGE_LABEL_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
};

// ── Helpers ────────────────────────────────────────────────────────

function nextRotation(r: BindRuneRotation): BindRuneRotation {
  return ((r + 90) % 360) as BindRuneRotation;
}

/** SVG transforms apply right-to-left: mirror across the vertical
 *  center axis first, then rotate about the canvas center. */
function layerTransform(layer: BindRuneLayer): string | undefined {
  const parts: string[] = [];
  if (layer.rotation !== 0) {
    parts.push(`rotate(${layer.rotation} ${CANVAS_CENTER} ${CANVAS_CENTER})`);
  }
  if (layer.mirrored) {
    parts.push(`translate(${CANVAS_SIZE} 0) scale(-1 1)`);
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function resolveStrokeLiteral(key: BindRuneStrokeKey): string {
  const option = BR_STROKE_OPTIONS.find((o) => o.key === key) ?? BR_STROKE_OPTIONS[0];
  if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(option.token)
      .trim();
    if (value) return value;
  }
  return option.fallback;
}

// ── Props ──────────────────────────────────────────────────────────

export interface BindRuneDesignerSurfaceProps {
  /** Loads the rune-set catalog (`GET /api/v1/runes/sets`). */
  loadRuneSets: () => Promise<BindRuneSetSummary[]>;
  /** Loads one set with all its runes (`GET /api/v1/runes/sets/{id}`). */
  loadRuneSet: (setId: string) => Promise<BindRuneSetDetail>;
  className?: string;
  style?: CSSProperties;
}

// ── Surface ────────────────────────────────────────────────────────

export function BindRuneDesignerSurface({
  loadRuneSets,
  loadRuneSet,
  className,
  style,
}: BindRuneDesignerSurfaceProps) {
  const [sets, setSets] = useState<BindRuneSetSummary[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [runes, setRunes] = useState<BindRuneGlyph[]>([]);
  const [layers, setLayers] = useState<BindRuneLayer[]>([]);
  const [strokeKey, setStrokeKey] = useState<BindRuneStrokeKey>("ink");
  const [showStave, setShowStave] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const layerSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void loadRuneSets().then((rows) => {
      if (cancelled || !Array.isArray(rows)) return;
      setSets(rows);
      setActiveSetId((prev) => prev ?? rows[0]?.set_id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [loadRuneSets]);

  useEffect(() => {
    if (activeSetId == null) return;
    let cancelled = false;
    void loadRuneSet(activeSetId).then((detail) => {
      if (cancelled) return;
      setRunes(Array.isArray(detail?.runes) ? detail.runes : []);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSetId, loadRuneSet]);

  const strokeOption = BR_STROKE_OPTIONS.find((o) => o.key === strokeKey) ?? BR_STROKE_OPTIONS[0];
  const strokeVar = `var(${strokeOption.token})`;

  const canvasLabel = useMemo(() => bindRuneCanvasLabel(layers.map((l) => l.runeName)), [layers]);

  const handleAddRune = (rune: BindRuneGlyph) => {
    if (activeSetId == null) return;
    layerSeq.current += 1;
    setLayers((prev) => [
      ...prev,
      {
        id: `layer-${layerSeq.current}`,
        setId: activeSetId,
        runeName: rune.name,
        transliteration: rune.transliteration,
        glyph: rune.glyph,
        rotation: 0,
        mirrored: false,
        scale: 1,
        opacity: 1,
      },
    ]);
  };

  const patchLayer = (id: string, patch: Partial<BindRuneLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleDownload = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // The border/background chrome is app UI, not part of the mark.
    clone.removeAttribute("style");
    // The live canvas paints through CSS custom properties (style
    // attributes) — resolve them to literal values so the exported
    // file renders outside the app's token layer.
    const literal = resolveStrokeLiteral(strokeKey);
    for (const text of Array.from(clone.querySelectorAll("text"))) {
      text.removeAttribute("style");
      text.setAttribute("font-family", BR_RUNE_FONT_STACK);
      text.setAttribute("fill", literal);
    }
    const stave = clone.querySelector("[data-stave]");
    if (stave) {
      stave.removeAttribute("style");
      stave.setAttribute("stroke", literal);
    }
    const markup = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([markup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = BR_DOWNLOAD_FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-component="bind-rune-surface"
      data-set={activeSetId ?? ""}
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
            }}
          >
            {BR_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {BR_TOPBAR_SUBTITLE}
          </div>
        </div>
      </header>

      <div className="br-panes" style={PANES_STYLE}>
        <aside className="scroll" style={RAIL_STYLE}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {BR_RAIL_SET_LABEL}
            <select
              data-set-select
              value={activeSetId ?? ""}
              onChange={(e) => setActiveSetId(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "7px 8px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
              }}
            >
              {sets.map((s) => (
                <option key={s.set_id} value={s.set_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div style={EYEBROW_STYLE}>{BR_RAIL_EYEBROW}</div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              margin: "0 0 10px",
            }}
          >
            {BR_RAIL_HINT}
          </p>
          <div
            data-rune-grid
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
            }}
          >
            {runes.map((r) => (
              <button
                key={r.index}
                type="button"
                data-rune-name={r.name}
                aria-label={`Add ${r.name} (${r.transliteration})`}
                onClick={() => handleAddRune(r)}
                style={RUNE_BUTTON_STYLE}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-rune)",
                    fontSize: 22,
                    color: "var(--accent)",
                    lineHeight: 1,
                  }}
                >
                  {r.glyph}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    color: "var(--ink-soft)",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.name}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={TOOLBAR_STYLE}>
              <div role="group" aria-label={BR_STROKE_LABEL} style={SEGMENT_GROUP_STYLE}>
                {BR_STROKE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    data-stroke-option={o.key}
                    aria-pressed={strokeKey === o.key}
                    onClick={() => setStrokeKey(o.key)}
                    style={strokeKey === o.key ? SEG_ON : SEG_BASE}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  data-action="toggle-stave"
                  aria-pressed={showStave}
                  onClick={() => setShowStave((v) => !v)}
                  style={
                    showStave
                      ? { ...GHOST_BUTTON, color: "var(--ink)", background: "var(--accent-soft)" }
                      : GHOST_BUTTON
                  }
                >
                  {BR_STAVE_TOGGLE}
                </button>
                <button
                  type="button"
                  data-action="download-svg"
                  onClick={handleDownload}
                  style={PRIMARY_BUTTON}
                >
                  {BR_DOWNLOAD_SVG}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <svg
                ref={svgRef}
                data-bindrune-canvas
                role="img"
                aria-label={canvasLabel}
                viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                }}
              >
                {showStave ? (
                  <line
                    data-stave
                    x1={CANVAS_CENTER}
                    y1={STAVE_TOP}
                    x2={CANVAS_CENTER}
                    y2={STAVE_BOTTOM}
                    strokeWidth={STAVE_WIDTH}
                    strokeLinecap="round"
                    style={{ stroke: strokeVar }}
                  />
                ) : null}
                {layers.map((l) => (
                  <text
                    key={l.id}
                    data-layer-glyph={l.id}
                    x={CANVAS_CENTER}
                    y={CANVAS_CENTER}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={GLYPH_BASE_SIZE * l.scale}
                    opacity={l.opacity}
                    transform={layerTransform(l)}
                    style={{
                      fontFamily: "var(--font-rune)",
                      fill: strokeVar,
                    }}
                  >
                    {l.glyph}
                  </text>
                ))}
              </svg>
            </div>

            <p
              data-method-note
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                textAlign: "center",
                margin: "0 0 20px",
              }}
            >
              {BR_METHOD_NOTE}
            </p>

            <div style={{ ...EYEBROW_STYLE, marginTop: 0 }}>{BR_COMPOSITION_EYEBROW}</div>
            {layers.length === 0 ? (
              <p
                data-composition-empty
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  margin: 0,
                }}
              >
                {BR_COMPOSITION_EMPTY}
              </p>
            ) : (
              <div data-composition style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {layers.map((l) => (
                  <div key={l.id} data-layer-row={l.id} style={LAYER_ROW_STYLE}>
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--font-rune)",
                        fontSize: 19,
                        color: "var(--accent)",
                        lineHeight: 1,
                      }}
                    >
                      {l.glyph}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink)",
                        minWidth: 74,
                      }}
                    >
                      {l.runeName}
                    </span>
                    <button
                      type="button"
                      data-action="rotate"
                      aria-label={`${BR_ROTATE_LABEL} ${l.runeName}`}
                      onClick={() => patchLayer(l.id, { rotation: nextRotation(l.rotation) })}
                      style={GHOST_BUTTON}
                    >
                      {BR_ROTATE_LABEL} {l.rotation}°
                    </button>
                    <button
                      type="button"
                      data-action="mirror"
                      aria-label={`${BR_MIRROR_LABEL} ${l.runeName}`}
                      aria-pressed={l.mirrored}
                      onClick={() => patchLayer(l.id, { mirrored: !l.mirrored })}
                      style={
                        l.mirrored
                          ? {
                              ...GHOST_BUTTON,
                              color: "var(--ink)",
                              background: "var(--accent-soft)",
                            }
                          : GHOST_BUTTON
                      }
                    >
                      {BR_MIRROR_LABEL}
                    </button>
                    <label style={RANGE_LABEL_STYLE}>
                      {BR_SCALE_LABEL}
                      <input
                        type="range"
                        data-control="scale"
                        aria-label={`${BR_SCALE_LABEL} ${l.runeName}`}
                        min={0.4}
                        max={1.6}
                        step={0.05}
                        value={l.scale}
                        onChange={(e) => patchLayer(l.id, { scale: Number(e.target.value) })}
                        style={{ width: 80 }}
                      />
                    </label>
                    <label style={RANGE_LABEL_STYLE}>
                      {BR_OPACITY_LABEL}
                      <input
                        type="range"
                        data-control="opacity"
                        aria-label={`${BR_OPACITY_LABEL} ${l.runeName}`}
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={l.opacity}
                        onChange={(e) => patchLayer(l.id, { opacity: Number(e.target.value) })}
                        style={{ width: 80 }}
                      />
                    </label>
                    <button
                      type="button"
                      data-action="remove"
                      aria-label={`${BR_REMOVE_LABEL} ${l.runeName}`}
                      onClick={() => setLayers((prev) => prev.filter((x) => x.id !== l.id))}
                      style={{ ...GHOST_BUTTON, marginLeft: "auto" }}
                    >
                      {BR_REMOVE_LABEL}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
