/**
 * HoraryPanel — chart + 5-step interpretation + provisional + save.
 *
 * Verbatim from `Theourgia Divination Misc.dc.html` lines 182-213.
 * Two-column: wheel on the left + step-by-step interpretation on
 * the right ending in the verbatim provisional judgement.
 */

import { type CSSProperties } from "react";

import {
  HORARY_DEFAULT_STEPS,
  HORARY_MOMENT_DEFAULT,
  HORARY_MOMENT_EYEBROW,
  HORARY_PROVISIONAL_DEFAULT,
  HORARY_PROVISIONAL_EYEBROW,
  HORARY_SAVE_LABEL,
  HORARY_STEPS_EYEBROW,
  HORARY_SYSTEM_CAPTION,
} from "./copy.js";
import { HoraryWheel } from "./HoraryWheel.js";

export interface HoraryStepRow {
  n: string;
  title: string;
  value: string;
  note: string;
}

export interface HoraryPanelProps {
  /** Cast-moment caption. Defaults to a placeholder prompt. */
  momentLabel?: string;
  /** Five-step workflow data. Defaults to the mockup's demo cast. */
  steps?: readonly HoraryStepRow[];
  /** Verbatim provisional judgement text. */
  provisional?: string;
  onSave?: () => void;
  className?: string;
  style?: CSSProperties;
}

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

export function HoraryPanel({
  momentLabel = HORARY_MOMENT_DEFAULT,
  steps = HORARY_DEFAULT_STEPS,
  provisional = HORARY_PROVISIONAL_DEFAULT,
  onSave,
  className,
  style,
}: HoraryPanelProps) {
  return (
    <div
      data-component="horary-panel"
      className={`misc-cols${className ? ` ${className}` : ""}`}
      style={{
        display: "flex",
        gap: 28,
        alignItems: "flex-start",
        ...style,
      }}
    >
      <div style={{ flex: "none" }}>
        <div style={{ ...EYEBROW, marginBottom: 8 }}>
          {HORARY_MOMENT_EYEBROW}
        </div>
        <div
          data-moment-label
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            marginBottom: 14,
          }}
        >
          {momentLabel}
        </div>
        <div
          data-wheel-frame
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background:
              "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
            padding: 20,
          }}
        >
          <HoraryWheel />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-glyph)",
              color: "var(--accent)",
            }}
          >
            ⚹
          </span>
          {HORARY_SYSTEM_CAPTION}
        </div>
      </div>

      <aside style={{ flex: "1 1 360px", minWidth: 0 }}>
        <div style={{ ...EYEBROW, marginBottom: 12 }}>
          {HORARY_STEPS_EYEBROW}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {steps.length === 0 ? (
            <div
              style={{
                padding: "18px 0",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              Cast a chart to fill this reading — sect, querent,
              quesited, perfection, witnesses. The ephemeris engine
              ships with Phase 06 divination completion.
            </div>
          ) : null}
          {steps.map((s, i) => (
            <div
              key={i}
              data-step
              style={{
                display: "flex",
                gap: 14,
                padding: "14px 0",
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--line)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  color: "var(--accent)",
                  width: 20,
                  flex: "none",
                }}
              >
                {s.n}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      color: "var(--ink)",
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      color: "var(--accent)",
                    }}
                  >
                    {s.value}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "var(--ink-soft)",
                    margin: "4px 0 0",
                  }}
                >
                  {s.note}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          data-provisional
          style={{
            marginTop: 18,
            padding: "16px 18px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
          }}
        >
          <div style={{ ...EYEBROW, marginBottom: 6 }}>
            {HORARY_PROVISIONAL_EYEBROW}
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              margin: 0,
            }}
          >
            {provisional}
          </p>
        </div>

        <button
          type="button"
          data-action="save"
          onClick={onSave}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
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
          {HORARY_SAVE_LABEL}
        </button>
      </aside>
    </div>
  );
}
