/**
 * IChingSurface — full composition of the Phase-06 I Ching surface.
 *
 * Verbatim composition from `Theourgia I Ching.dc.html`. The cast
 * column lives left (with a "becoming" hexagram appearing once any
 * line changes), and the result column lives right (CJK heading,
 * judgment + image, changing-lines panel, citation, save).
 *
 * H04 §S3.2 honesty rule: coin and yarrow methods use different odds
 * — the surface accepts both engines from `divination/iching`. The
 * "Cast all six" shortcut is withheld when yarrow is active (yarrow
 * is the slower meditative rite).
 *
 * H04 §S3.1 tone rule: hexagrams 23 (Splitting Apart) and 36
 * (Darkening of the Light) render in the same neutral palette as
 * every other result. No red. The interpretation text carries the
 * difficulty.
 */

import { type CSSProperties, useState } from "react";

import {
  type IchingMethod,
  type LineValue,
  type Transformation,
  castLine,
  castSixLines,
  hexagramName,
  hexagramNumber,
  isChanging,
  transformation,
  trigramComposition,
} from "../divination/index.js";
import { ChangingLinesPanel } from "./ChangingLinesPanel.js";
import {
  CAST_INITIAL_PROMPT,
  ICHING_DEFAULT_QUESTION,
  ICHING_EMPTY_BODY,
  ICHING_SAVE_CAPTION,
  ICHING_STABLE_NOTE,
  PLACEHOLDER_LINE_TEXT,
  WILHELM_BAYNES_CITATION,
  castProgressPrompt,
  lineName,
} from "./copy.js";
import { HexagramColumn } from "./HexagramColumn.js";
import { HexagramHeading } from "./HexagramHeading.js";
import { MethodPicker } from "./MethodPicker.js";

export interface IChingHexagramText {
  /** Verbatim translated Judgment paragraph for this hexagram. */
  judgment: string;
  /** Verbatim translated Image paragraph. */
  image: string;
}

export interface IChingSurfaceProps {
  /** The practitioner's question. Editable via onEditQuestion. */
  question?: string;
  onEditQuestion?: () => void;
  /** Hexagram text supplier (Judgment + Image). Defaults to a thin
   *  placeholder until the backend wires up. */
  textsFor?: (kingWenNumber: number) => IChingHexagramText | null;
  /** Per-line commentary supplier. Defaults to the mockup's generic
   *  corpus until the backend wires real per-line Wilhelm text. */
  lineTextFor?: (lineIndex: number, value: 6 | 9) => string;
  /** Called when the user clicks Save consultation to journal. */
  onSave?: (saveTitle: string) => void;
  /** Initial casting method. Defaults to 'coin' per the mockup. */
  initialMethod?: IchingMethod;
  /** Initial random source (for tests/stories). Defaults to
   *  Math.random. */
  random?: () => number;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_TEXTS: IChingHexagramText = {
  judgment:
    "Read the Judgment against your question, and weigh the lines that move.",
  image:
    "Read the Image as the attitude the time asks of you.",
};

const PRIMARY_BUTTON: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "11px 22px",
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
  padding: "11px 18px",
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

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

export function IChingSurface({
  question = ICHING_DEFAULT_QUESTION,
  onEditQuestion,
  textsFor,
  lineTextFor,
  onSave,
  initialMethod = "coin",
  random = Math.random,
  className,
  style,
}: IChingSurfaceProps) {
  const [method, setMethod] = useState<IchingMethod>(initialMethod);
  const [lines, setLines] = useState<LineValue[]>([]);

  const complete = lines.length >= 6;
  const cast = lines.length;

  const primaryNumber = complete
    ? hexagramNumber(lines as readonly LineValue[])
    : null;
  const primaryHex = primaryNumber ? hexagramName(primaryNumber) : null;
  const composition = complete
    ? trigramComposition(lines as readonly LineValue[])
    : null;

  const trans: Transformation | null = complete
    ? transformation(lines as readonly LineValue[])
    : null;
  const hasChange = (trans?.changingLines.length ?? 0) > 0;
  const relating = hasChange ? hexagramName(trans!.relating) : null;

  const texts =
    (primaryNumber && textsFor?.(primaryNumber)) || DEFAULT_TEXTS;

  const lineCommentary =
    trans?.changingLines.map((i) => ({
      name: lineName(i, lines[i] as 6 | 9),
      text: lineTextFor
        ? lineTextFor(i, lines[i] as 6 | 9)
        : (PLACEHOLDER_LINE_TEXT[i] ?? ""),
    })) ?? [];

  const handleCastLine = () => {
    if (cast >= 6) return;
    const next = castLine(method, random);
    setLines((ls) => [...ls, next]);
  };

  const handleCastAll = () => {
    // Coin-only shortcut — yarrow withholds this per §S3.2.
    if (method !== "coin") return;
    setLines(castSixLines("coin", random));
  };

  const handleReset = () => setLines([]);

  const handleSave = () => {
    if (!primaryHex) return;
    onSave?.(
      `${primaryHex.english} (№${primaryHex.number})`,
    );
  };

  const castPrompt =
    cast === 0
      ? CAST_INITIAL_PROMPT
      : castProgressPrompt(cast, method);

  // Build the "becoming" lines preview (lines after changing → flipped).
  const relLinesPreview = lines.map((v) =>
    isChanging(v) ? ((v === 9 ? 8 : 7) as LineValue) : v,
  );

  return (
    <div
      data-component="iching-surface"
      data-method={method}
      data-phase={complete ? "complete" : "casting"}
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
          {/* Method picker */}
          <div style={{ marginBottom: 16 }}>
            <MethodPicker value={method} onChange={setMethod} />
          </div>

          {/* Question banner — verbatim from lines 105-109 */}
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

          <div
            className="ich-cols"
            style={{
              display: "flex",
              gap: 30,
              alignItems: "flex-start",
            }}
          >
            {/* Casting column */}
            <div
              style={{
                flex: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                data-cast-frame
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-lg)",
                  background:
                    "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
                  padding: "26px 30px",
                  display: "flex",
                  gap: 26,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      ...EYEBROW,
                      fontSize: 9.5,
                      letterSpacing: "0.13em",
                    }}
                  >
                    Cast
                  </div>
                  <HexagramColumn
                    lines={lines}
                    count={cast}
                    markChanging
                  />
                </div>
                {complete && hasChange ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        alignSelf: "stretch",
                        color: "var(--ink-mute)",
                        paddingTop: 18,
                      }}
                      aria-hidden="true"
                    >
                      <svg
                        width={22}
                        height={22}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 9,
                      }}
                    >
                      <div
                        style={{
                          ...EYEBROW,
                          fontSize: 9.5,
                          letterSpacing: "0.13em",
                        }}
                      >
                        Becoming
                      </div>
                      <HexagramColumn lines={relLinesPreview} count={6} />
                    </div>
                  </>
                ) : null}
              </div>

              {!complete ? (
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 14.5,
                      color: "var(--ink-mute)",
                      marginBottom: 12,
                    }}
                  >
                    {castPrompt}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      data-action="cast-line"
                      onClick={handleCastLine}
                      style={PRIMARY_BUTTON}
                    >
                      <span
                        aria-hidden="true"
                        style={{ fontFamily: "var(--font-glyph)" }}
                      >
                        ✶
                      </span>
                      Cast a line
                    </button>
                    {method === "coin" ? (
                      <button
                        type="button"
                        data-action="cast-all"
                        onClick={handleCastAll}
                        style={SECONDARY_BUTTON}
                      >
                        Cast all six
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-action="reset"
                  onClick={handleReset}
                  style={{ ...SECONDARY_BUTTON, padding: "9px 18px" }}
                >
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
                    style={{ marginRight: 8 }}
                  >
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
                  </svg>
                  Begin a new cast
                </button>
              )}
            </div>

            {/* Result column */}
            <div style={{ flex: "1 1 380px", minWidth: 0 }}>
              {complete && primaryHex ? (
                <>
                  <HexagramHeading
                    hexagram={primaryHex}
                    composition={composition ?? undefined}
                  />

                  <div style={{ ...EYEBROW, marginBottom: 6 }}>
                    The Judgment
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 16,
                      lineHeight: 1.65,
                      color: "var(--ink-soft)",
                      margin: "0 0 18px",
                    }}
                  >
                    {texts.judgment}
                  </p>

                  <div style={{ ...EYEBROW, marginBottom: 6 }}>
                    The Image
                  </div>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 15.5,
                      lineHeight: 1.6,
                      color: "var(--ink-soft)",
                      margin: "0 0 18px",
                    }}
                  >
                    {texts.image}
                  </p>

                  {hasChange && relating ? (
                    <ChangingLinesPanel
                      commentary={lineCommentary}
                      relating={relating}
                    />
                  ) : (
                    <p
                      data-stable-note
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 14.5,
                        color: "var(--ink-mute)",
                        margin: "0 0 18px",
                      }}
                    >
                      {ICHING_STABLE_NOTE}
                    </p>
                  )}

                  {/* Citation chrome — ‡ primary */}
                  <div
                    data-citation
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "9px 12px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-2)",
                      marginBottom: 24,
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
                      aria-hidden="true"
                    >
                      ‡
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11.5,
                        color: "var(--ink-mute)",
                        lineHeight: 1.3,
                      }}
                    >
                      {WILHELM_BAYNES_CITATION} · primary
                    </span>
                  </div>

                  {/* Save row */}
                  <div
                    data-save-row
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      paddingTop: 18,
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
                      Save consultation to journal
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {ICHING_SAVE_CAPTION}
                    </span>
                  </div>
                </>
              ) : (
                <div
                  data-empty-prompt
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 300,
                    textAlign: "center",
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "var(--line)",
                    borderRadius: "var(--r-lg)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-cjk)",
                      fontSize: 38,
                      color: "var(--ink-mute)",
                      marginBottom: 14,
                    }}
                    aria-hidden="true"
                  >
                    易
                  </span>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "var(--ink-mute)",
                      margin: 0,
                      maxWidth: 280,
                    }}
                  >
                    {ICHING_EMPTY_BODY}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
