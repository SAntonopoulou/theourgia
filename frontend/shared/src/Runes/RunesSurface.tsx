/**
 * RunesSurface — full composition of the Phase-06 Runes surface.
 *
 * Verbatim composition from `Theourgia Runes.dc.html`. Two-column
 * board + reading-rail layout. The H04 §S3.5 honesty rule is
 * enforced by the engine (symmetric staves always merkstave: false)
 * and surfaced by RuneReadingRail (symmetric callout, no merkstave
 * pill).
 */

import { type CSSProperties, useMemo, useState } from "react";

import {
  type RuneDrawSize,
  drawRunes,
} from "../divination/index.js";
import {
  RUNES_DEFAULT_QUESTION,
  RUNES_DRAW_LABEL,
  RUNES_SAVE_CAPTION,
  RUNES_SAVE_LABEL,
  RUNES_SIZE_OPTIONS,
} from "./copy.js";
import { RuneBoard } from "./RuneBoard.js";
import { RuneReadingRail } from "./RuneReadingRail.js";
import { RuneSizePicker } from "./RuneSizePicker.js";

export interface RunesSurfaceProps {
  question?: string;
  onEditQuestion?: () => void;
  /** Initial draw size. Mockup default: 3. */
  initialSize?: RuneDrawSize;
  /** Initial seed (deterministic XOR-shift). Defaults to 4 per the
   *  mockup. */
  initialSeed?: number;
  interpretation?: string;
  onInterpretationChange?: (next: string) => void;
  onSave?: (title: string) => void;
  className?: string;
  style?: CSSProperties;
}

const PRIMARY_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "9px 18px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  marginLeft: 6,
  cursor: "pointer",
};

export function RunesSurface({
  question = RUNES_DEFAULT_QUESTION,
  onEditQuestion,
  initialSize = 3,
  initialSeed = 4,
  interpretation,
  onInterpretationChange,
  onSave,
  className,
  style,
}: RunesSurfaceProps) {
  const [size, setSize] = useState<RuneDrawSize>(initialSize);
  const [seed, setSeed] = useState(initialSeed);
  const [sel, setSel] = useState(0);
  const [interpLocal, setInterpLocal] = useState("");

  const drawn = useMemo(() => drawRunes(size, seed), [size, seed]);

  const interp = interpretation ?? interpLocal;
  const setInterp = (v: string) => {
    setInterpLocal(v);
    onInterpretationChange?.(v);
  };

  const selectedDrawn = drawn[Math.min(sel, drawn.length - 1)] ?? null;

  const sizeLabel =
    RUNES_SIZE_OPTIONS.find((o) => o.key === size)?.label ?? "";

  const handleDraw = () => {
    setSeed((s) => s + 1);
    setSel(0);
  };

  const handleSave = () => {
    if (!selectedDrawn) return;
    onSave?.(`Runes — ${sizeLabel}`);
  };

  return (
    <div
      data-component="runes-surface"
      className={className}
      style={style}
    >
      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 28px 60px",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          {/* Draw size + draw button */}
          <div
            data-controls
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
              }}
            >
              Draw
            </span>
            <RuneSizePicker
              value={size}
              onChange={(s) => {
                setSize(s);
                setSel(0);
              }}
            />
            <button
              type="button"
              data-action="draw"
              onClick={handleDraw}
              style={PRIMARY_BUTTON}
            >
              <span
                aria-hidden="true"
                style={{ fontFamily: "var(--font-glyph)" }}
              >
                ✶
              </span>
              {RUNES_DRAW_LABEL}
            </button>
          </div>

          {/* Question banner */}
          <div
            data-question
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 18px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              marginBottom: 24,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--div)",
                fontSize: 16,
                flex: "none",
              }}
            >
              ❖
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--ink)",
              }}
            >
              {question}
            </span>
            {onEditQuestion ? (
              <button
                type="button"
                onClick={onEditQuestion}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  flex: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            ) : null}
          </div>

          {/* Board + Rail */}
          <div
            className="rune-cols"
            style={{ display: "flex", gap: 26, alignItems: "flex-start" }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 14,
                }}
              >
                {sizeLabel}
              </div>
              <div
                data-board-frame
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-lg)",
                  background:
                    "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
                  padding: "28px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RuneBoard
                  size={size}
                  drawn={drawn}
                  selected={sel}
                  onSelect={(i) => setSel(i)}
                />
              </div>
            </div>

            <RuneReadingRail
              drawn={selectedDrawn}
              interpretation={interp}
              onInterpretationChange={setInterp}
            />
          </div>

          {/* Save row */}
          <div
            data-save-row
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 28,
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopStyle: "solid",
              borderTopColor: "var(--line)",
            }}
          >
            <button
              type="button"
              data-action="save"
              onClick={handleSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 16px",
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
              <svg
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 4h11l3 3v13H5zM8 4v5h7" />
              </svg>
              {RUNES_SAVE_LABEL}
            </button>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
              }}
            >
              {RUNES_SAVE_CAPTION}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
