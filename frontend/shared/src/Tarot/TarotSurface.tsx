/**
 * TarotSurface — full composition of the Phase-06 Tarot surface.
 *
 * Verbatim composition from `Theourgia Tarot.dc.html`. Manages the
 * view toggle (Draw / History), spread selection, draw state, and
 * card selection. Save-to-journal + edit-question fires callbacks
 * for the parent route.
 *
 * H04 tone discipline (§S3.1): reversed cards render the gentle ⟲
 * indicator, NEVER red. No outcome — Tower, Devil, Death, anything
 * — gets a difficulty colour.
 */

import { type CSSProperties, type ReactNode, useMemo, useState } from "react";

import {
  type DrawnCard,
  type SpreadKind,
  drawSpread,
  spreadLayout,
} from "../divination/index.js";
import { CardReadingRail } from "./CardReadingRail.js";
import { DeckPicker } from "./DeckPicker.js";
import { QuestionBanner } from "./QuestionBanner.js";
import { SpreadBoard } from "./SpreadBoard.js";
import { SpreadPicker } from "./SpreadPicker.js";
import {
  TAROT_DEFAULT_QUESTION,
  TAROT_RITUAL_PROMPT,
  TAROT_SPREAD_CHIPS,
} from "./copy.js";
import { TarotHistoryRow } from "./TarotHistoryRow.js";

export type TarotView = "draw" | "history";

export interface TarotPastReading {
  id: string;
  date: string;
  title: string;
  cardsLine: string;
  spreadKind: SpreadKind;
}

export interface TarotSurfaceProps {
  /** Active view; controlled by parent so deep-links work. Defaults
   *  to 'draw'. */
  view?: TarotView;
  onViewChange?: (view: TarotView) => void;
  /** Initial spread when no spread is specified by the route. */
  initialSpread?: SpreadKind;
  /** The question the practitioner is asking. The Edit button calls
   *  onEditQuestion; this component does not own the editor modal. */
  question?: string;
  onEditQuestion?: () => void;
  /** Practitioner's interpretation. The textarea controls itself if
   *  this is not supplied; pass through for parent control. */
  interpretation?: string;
  onInterpretationChange?: (next: string) => void;
  /** Save-reading-to-journal click handler. */
  onSave?: (saveTitle: string) => void;
  /** Past readings to render in the History view. */
  pastReadings?: readonly TarotPastReading[];
  /** Override the deterministic seed for the initial draw. Useful
   *  for tests + stories. */
  initialSeed?: number;
  className?: string;
  style?: CSSProperties;
}

const PLUS_STAR: ReactNode = (
  <span
    aria-hidden="true"
    style={{ fontFamily: "var(--font-glyph)" }}
  >
    ✶
  </span>
);

const RESHUFFLE_ICON: ReactNode = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
  </svg>
);

const SAVE_ICON: ReactNode = (
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
);

const VIEW_TAB_BASE: CSSProperties = {
  padding: "5px 12px",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
  background: "transparent",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: 6,
  cursor: "pointer",
};
const VIEW_TAB_ON: CSSProperties = {
  ...VIEW_TAB_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

const PRIMARY_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "11px 24px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

const SECONDARY_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 18px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

export function TarotSurface({
  view: viewProp,
  onViewChange,
  initialSpread = "three",
  question = TAROT_DEFAULT_QUESTION,
  onEditQuestion,
  interpretation,
  onInterpretationChange,
  onSave,
  pastReadings,
  initialSeed = 7,
  className,
  style,
}: TarotSurfaceProps) {
  const [viewLocal, setViewLocal] = useState<TarotView>("draw");
  const view = viewProp ?? viewLocal;
  const setView = (v: TarotView) => {
    setViewLocal(v);
    onViewChange?.(v);
  };

  const [spread, setSpread] = useState<SpreadKind>(initialSpread);
  const [phase, setPhase] = useState<"ready" | "drawn">("drawn");
  const [seed, setSeed] = useState(initialSeed);
  const [sel, setSel] = useState(0);
  const [interpLocal, setInterpLocal] = useState("");

  const drawn: DrawnCard[] = useMemo(
    () => drawSpread(spread, seed),
    [spread, seed],
  );
  const layout = spreadLayout(spread);
  const selectedDrawn = phase === "drawn" ? drawn[sel] : null;

  const interp = interpretation ?? interpLocal;
  const setInterp = (v: string) => {
    setInterpLocal(v);
    onInterpretationChange?.(v);
  };

  const saveTitle = `${layout.name}, ${formatToday()}`;

  return (
    <div
      data-component="tarot-surface"
      data-view={view}
      className={className}
      style={style}
    >
      {/* View toggle (Draw / History) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px 28px 0",
        }}
      >
        <div
          role="group"
          aria-label="View"
          data-view-toggle
          style={{
            display: "flex",
            gap: 2,
            padding: 3,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: 8,
            background: "var(--bg-2)",
          }}
        >
          <button
            type="button"
            aria-pressed={view === "draw"}
            onClick={() => setView("draw")}
            style={view === "draw" ? VIEW_TAB_ON : VIEW_TAB_BASE}
          >
            Draw
          </button>
          <button
            type="button"
            aria-pressed={view === "history"}
            onClick={() => setView("history")}
            style={view === "history" ? VIEW_TAB_ON : VIEW_TAB_BASE}
          >
            History
          </button>
        </div>
      </div>

      <main
        className="scroll"
        style={{
          overflowY: "auto",
          minHeight: 0,
          padding: "24px 28px 60px",
        }}
      >
        {view === "draw" ? (
          <div style={{ maxWidth: 1140, margin: "0 auto" }}>
            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <DeckPicker />
              <SpreadPicker
                value={spread}
                onChange={(k) => {
                  setSpread(k);
                  setSel(0);
                }}
              />
            </div>

            {/* Question */}
            <div style={{ marginBottom: 22 }}>
              <QuestionBanner question={question} onEdit={onEditQuestion} />
            </div>

            {/* Board + Rail */}
            <div
              className="tarot-cols"
              style={{
                display: "flex",
                gap: 26,
                alignItems: "flex-start",
              }}
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
                  {layout.name} · {layout.positions.length} cards
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
                    padding: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SpreadBoard
                    spread={spread}
                    drawn={phase === "drawn" ? drawn : null}
                    selected={sel}
                    onSelect={(i) => setSel(i)}
                  />
                </div>

                {/* Action row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    marginTop: 18,
                  }}
                >
                  {phase === "ready" ? (
                    <>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: 15,
                          color: "var(--ink-mute)",
                        }}
                      >
                        {TAROT_RITUAL_PROMPT}
                      </div>
                      <button
                        type="button"
                        data-action="draw"
                        onClick={() => {
                          setPhase("drawn");
                          setSel(0);
                        }}
                        style={PRIMARY_BUTTON}
                      >
                        {PLUS_STAR}
                        Draw the spread
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-action="reshuffle"
                      onClick={() => {
                        setSeed((s) => s + 1);
                        setSel(0);
                      }}
                      style={SECONDARY_BUTTON}
                    >
                      {RESHUFFLE_ICON}
                      Shuffle &amp; draw again
                    </button>
                  )}
                </div>
              </div>

              <CardReadingRail
                drawn={selectedDrawn}
                interpretation={interp}
                onInterpretationChange={setInterp}
              />
            </div>

            {/* Save row */}
            {phase === "drawn" ? (
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
                  onClick={() => onSave?.(saveTitle)}
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
                  {SAVE_ICON}
                  Save reading to journal
                </button>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  Saved as “{saveTitle}.”
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          // History view
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginBottom: 16,
              }}
            >
              Past spreads
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {(pastReadings ?? []).map((r) => (
                <TarotHistoryRow
                  key={r.id}
                  date={r.date}
                  title={r.title}
                  cardsLine={r.cardsLine}
                  spreadLabel={
                    TAROT_SPREAD_CHIPS.find((c) => c.key === r.spreadKind)
                      ?.label ?? r.spreadKind
                  }
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatToday(): string {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString(undefined, { month: "short" });
  const year = today.getFullYear();
  return `${day} ${month} ${year}`;
}
