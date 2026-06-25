/**
 * MagicSquaresSurface — composes the H05 Magic Squares end-to-end.
 *
 * Two-pane: PlanetaryRail (260px) · main (mode toolbar + square
 * SVG + citation card + selected-cell footer).
 *
 * The seven planetary squares ship as B90 fixtures (Agrippa 1531);
 * Build mode is disabled for them. The Trace mode's "Save as sigil"
 * action hands off to the Sigil Generator's Kamea mode via
 * `onSaveAsSigil` — per H05 §S2.4, this **forks** a new sigil row
 * and never mutates the source square.
 */

import { type CSSProperties, useMemo, useState } from "react";

import { PLANETARY_SQUARES, magicSquare } from "../workshop/index.js";

import {
  BUILD_ORDER_LABEL,
  BUILD_SAVE_LABEL,
  CUSTOM_NOTE,
  DEMO_CUSTOM_NAME,
  DEMO_CUSTOM_ORDER,
  META_CONSTANT_PREFIX,
  META_ORDER_PREFIX,
  MODE_BUILD,
  MODE_TRACE,
  MODE_VIEW,
  PLANETARY_CITATION,
  PLANET_NAMES,
  SELECTED_CELL_PREFIX,
  MS_TOPBAR_SUBTITLE,
  MS_TOPBAR_TITLE,
  TRACE_RESET,
  TRACE_SAVE_AS_SIGIL,
  TRACE_SAVE_GLYPH,
  type MagicSquareMode,
  type SquareId,
} from "./copy.js";
import { PlanetaryRail, type CustomSquareEntry } from "./PlanetaryRail.js";
import { SquareView } from "./SquareView.js";
import { hebNum } from "../workshop/index.js";

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

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "22px 26px 50px",
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

const SEG_DISABLED: CSSProperties = {
  ...SEG_BASE,
  opacity: 0.4,
  cursor: "not-allowed",
};

export interface MagicSquaresSurfaceProps {
  initialSquare?: SquareId;
  initialCustomId?: string | null;
  customSquares?: readonly CustomSquareEntry[];
  /** Fired when the Trace mode's "Save as sigil" CTA is clicked.
   *  The build side hands the cellSequence + squareId off to the
   *  Sigil Generator's Kamea mode (forks a new sigil row). */
  onSaveAsSigil?: (payload: {
    squareId: SquareId;
    cellSequence: number[];
  }) => void;
  /** Fired when the Build mode "Save" CTA is clicked. The current
   *  generated square (rows × cols of numbers) and its order are
   *  emitted; the admin route POSTs the row + supplies a default
   *  name (the surface intentionally has no naming dialog —
   *  designer scope). */
  onSaveCustomSquare?: (payload: {
    order: number;
    cells: number[][];
  }) => void;
  onCreateCustomSquare?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function MagicSquaresSurface({
  initialSquare = "saturn",
  initialCustomId = null,
  customSquares = [
    {
      id: "demo-binding",
      name: DEMO_CUSTOM_NAME,
      order: DEMO_CUSTOM_ORDER,
    },
  ],
  onSaveAsSigil,
  onSaveCustomSquare,
  onCreateCustomSquare,
  className,
  style,
}: MagicSquaresSurfaceProps) {
  const [square, setSquare] = useState<SquareId>(initialSquare);
  const [customValue, setCustomValue] = useState<string | null>(
    initialCustomId,
  );
  const [mode, setMode] = useState<MagicSquareMode>("view");
  const [order, setOrder] = useState(3);
  const [trace, setTrace] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const isCustom = square === "custom";

  const cells = useMemo(() => {
    if (isCustom) return null;
    const fixture = PLANETARY_SQUARES.find((p) => p.planet === square);
    if (fixture) return fixture.cells;
    return magicSquare(order);
  }, [square, order, isCustom]);

  const meta = useMemo(() => {
    if (isCustom) {
      return {
        name: customSquares.find((c) => c.id === customValue)?.name ??
          DEMO_CUSTOM_NAME,
        order,
        magicConstant: "—",
      };
    }
    const fixture = PLANETARY_SQUARES.find((p) => p.planet === square);
    if (!fixture)
      return { name: "Unknown", order, magicConstant: "—" };
    return {
      name: PLANET_NAMES[fixture.planet],
      order: fixture.order,
      magicConstant: fixture.magicConstant,
    };
  }, [isCustom, customSquares, customValue, square, order]);

  const selectedValue =
    selected != null && cells
      ? cells[Math.floor(selected / cells.length)]![selected % cells.length]
      : null;

  const handlePick = (id: SquareId, customId?: string) => {
    setSquare(id);
    setCustomValue(customId ?? null);
    setMode(id === "custom" ? "build" : "view");
    setTrace([]);
    setSelected(null);
    if (id !== "custom") {
      const fixture = PLANETARY_SQUARES.find((p) => p.planet === id);
      if (fixture) setOrder(fixture.order);
    }
  };

  const handleNew = () => {
    setSquare("custom");
    setCustomValue(null);
    setMode("build");
    setOrder(5);
    setTrace([]);
    setSelected(null);
    onCreateCustomSquare?.();
  };

  const handleSaveAsSigil = () => {
    onSaveAsSigil?.({
      squareId: square,
      cellSequence: trace.map((idx) => {
        if (!cells) return 0;
        const n = cells.length;
        return cells[Math.floor(idx / n)]![idx % n]!;
      }),
    });
  };

  const handleSaveCustomSquare = () => {
    if (!cells) return;
    // Deep-copy so callers can freely mutate the payload without
    // affecting the surface's in-memory grid.
    const snapshot = cells.map((row) => [...row]);
    onSaveCustomSquare?.({ order, cells: snapshot });
  };

  return (
    <div
      data-component="magic-squares-surface"
      data-square={square}
      data-mode={mode}
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
            {MS_TOPBAR_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {MS_TOPBAR_SUBTITLE}
          </div>
        </div>
      </header>

      <div className="ms-panes" style={PANES_STYLE}>
        <PlanetaryRail
          value={square}
          customValue={customValue}
          customSquares={customSquares}
          onPick={handlePick}
          onNew={handleNew}
        />

        <main className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={TOOLBAR_STYLE}>
              <div role="group" aria-label="Mode" style={SEGMENT_GROUP_STYLE}>
                <button
                  type="button"
                  aria-pressed={mode === "view"}
                  data-mode-button="view"
                  onClick={() => setMode("view")}
                  style={mode === "view" ? SEG_ON : SEG_BASE}
                >
                  {MODE_VIEW}
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "trace"}
                  data-mode-button="trace"
                  onClick={() => {
                    setMode("trace");
                    setTrace([]);
                  }}
                  style={mode === "trace" ? SEG_ON : SEG_BASE}
                >
                  {MODE_TRACE}
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "build"}
                  data-mode-button="build"
                  disabled={!isCustom}
                  onClick={() => isCustom && setMode("build")}
                  style={
                    !isCustom
                      ? SEG_DISABLED
                      : mode === "build"
                        ? SEG_ON
                        : SEG_BASE
                  }
                >
                  {MODE_BUILD}
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {mode === "build" ? (
                  <>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {BUILD_ORDER_LABEL}
                      <input
                        type="range"
                        min={3}
                        max={12}
                        value={order}
                        onChange={(e) => setOrder(Number(e.target.value))}
                        data-build-order
                        style={{ width: 90 }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent)",
                          width: 18,
                        }}
                      >
                        {order}
                      </span>
                    </label>
                    <button
                      type="button"
                      data-action="build-save"
                      onClick={handleSaveCustomSquare}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "var(--r-md)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 13,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {BUILD_SAVE_LABEL}
                    </button>
                  </>
                ) : null}
                {mode === "trace" ? (
                  <>
                    <button
                      type="button"
                      data-action="reset-trace"
                      onClick={() => setTrace([])}
                      style={{
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
                      }}
                    >
                      {TRACE_RESET}
                    </button>
                    <button
                      type="button"
                      data-action="save-as-sigil"
                      onClick={handleSaveAsSigil}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "8px 16px",
                        borderRadius: "var(--r-md)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 700,
                        fontSize: 13,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{ fontFamily: "var(--font-glyph)" }}
                      >
                        {TRACE_SAVE_GLYPH}
                      </span>
                      {TRACE_SAVE_AS_SIGIL}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <SquareView
                cells={cells}
                order={order}
                mode={mode}
                trace={trace}
                selected={selected}
                onSelectCell={(idx) => setSelected(idx)}
                onAppendTrace={(idx) => {
                  setTrace((t) => [...t, idx]);
                  setSelected(idx);
                }}
              />
            </div>

            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    margin: 0,
                  }}
                  data-square-name
                >
                  {meta.name}
                </h2>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {META_ORDER_PREFIX}
                  {meta.order}
                  {META_CONSTANT_PREFIX}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                    }}
                  >
                    {meta.magicConstant}
                  </span>
                </span>
              </div>
              {isCustom ? (
                <p
                  data-custom-note
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                    margin: "10px 0 0",
                  }}
                >
                  {CUSTOM_NOTE}
                </p>
              ) : (
                <div
                  data-citation
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                    padding: "7px 12px",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontFamily: "var(--font-glyph)",
                      fontSize: 12,
                      flex: "none",
                    }}
                  >
                    ‡
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {PLANETARY_CITATION}
                  </span>
                </div>
              )}
            </div>

            {selectedValue != null ? (
              <div
                data-selected-cell
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                <span style={{ color: "var(--ink-mute)" }}>
                  {SELECTED_CELL_PREFIX}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent)",
                  }}
                >
                  {selectedValue}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-hebrew)",
                    fontSize: 17,
                  }}
                >
                  {hebNum(selectedValue)}
                </span>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
