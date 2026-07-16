/**
 * PendulumPanel — calibration card · question input + Ask · dial + answer · session log.
 *
 * Verbatim from `Theourgia Divination Misc.dc.html` lines 104-147.
 * Calibration is per-session per H04 §S3.5 (each pendulum's swing
 * meaning can shift day to day). The Ask button gates the answer
 * pick to a calibrated session.
 */

import { type CSSProperties, useState } from "react";

import {
  DEFAULT_PENDULUM_CALIBRATION,
  type PendulumAnswer,
  pendulumAnswer,
} from "../divination/index.js";
import {
  PEND_ASK_LABEL,
  PEND_CALIBRATE_EYEBROW,
  PEND_CALIBRATE_NOTE,
  PEND_DEFAULT_NOTE,
  PEND_QUESTION_PLACEHOLDER,
  PEND_SESSION_LOG_EYEBROW,
} from "./copy.js";
import { PendulumDial } from "./PendulumDial.js";

const CALIB_ROWS: ReadonlyArray<{
  label: PendulumAnswer | "Maybe";
  dir: string;
  swing: string;
}> = [
  {
    label: "Yes",
    dir: "swings along the body",
    swing: "M12 4v15",
  },
  {
    label: "No",
    dir: "swings across",
    swing: "M4 12h15",
  },
  {
    label: "Maybe",
    dir: "circles, or stays still",
    swing: "M12 7a5 5 0 1 0 .1 0",
  },
];

export interface PendulumLogEntry {
  /** The answer (Yes/No/Maybe/Unclear). */
  answer: PendulumAnswer;
  /** The asked question. */
  question: string;
  /** Time stamp formatted by the caller (e.g. "14:24"). */
  timestamp: string;
}

/** What Ask hands the composing route — the same record the local
 *  session log keeps, plus the wire-ready ISO instant for
 *  ``POST /api/v1/pendulum/readings``. */
export interface PendulumAskEntry {
  answer: PendulumAnswer;
  /** The asked question; "—" when the practitioner left it blank,
   *  mirroring the session-log rail. */
  question: string;
  /** ISO 8601 instant of the ask (wire ``asked_at``). */
  askedAt: string;
}

export interface PendulumPanelProps {
  /** Initial answer to show on the dial. Pass ``null`` (default) for
   *  the honest "not yet asked" state; the dial + label render in
   *  --ink-mute until the practitioner clicks Ask. */
  initialAnswer?: PendulumAnswer | null;
  /** Initial log entries. */
  initialLog?: readonly PendulumLogEntry[];
  /** Fires on each Ask with the drawn answer — the composing route
   *  persists it. The local session log appends optimistically either
   *  way. */
  onAsk?: (entry: PendulumAskEntry) => void;
  /** Optional injected random source. */
  random?: () => number;
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

export function PendulumPanel({
  initialAnswer = null,
  initialLog,
  onAsk,
  random = Math.random,
  className,
  style,
}: PendulumPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<PendulumAnswer | null>(initialAnswer);
  const [log, setLog] = useState<readonly PendulumLogEntry[]>(
    initialLog ?? [],
  );

  const ask = () => {
    const next = pendulumAnswer(DEFAULT_PENDULUM_CALIBRATION, random);
    setAnswer(next);
    const askedAt = new Date();
    const stamp = askedAt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const asked = question || "—";
    setLog((prev) => [
      { answer: next, question: asked, timestamp: stamp },
      ...prev,
    ]);
    onAsk?.({ answer: next, question: asked, askedAt: askedAt.toISOString() });
    setQuestion("");
  };

  return (
    <div
      data-component="pendulum-panel"
      className={`misc-cols${className ? ` ${className}` : ""}`}
      style={{
        display: "flex",
        gap: 26,
        alignItems: "flex-start",
        ...style,
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        {/* Calibration card */}
        <div
          data-calibration
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-lg)",
            background: "var(--bg-2)",
            padding: "20px 22px",
            marginBottom: 20,
          }}
        >
          <div style={{ ...EYEBROW, marginBottom: 10 }}>
            {PEND_CALIBRATE_EYEBROW}
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              margin: "0 0 14px",
              lineHeight: 1.5,
            }}
          >
            {PEND_CALIBRATE_NOTE}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {CALIB_ROWS.map((row) => (
              <div
                key={row.label}
                data-calib-row={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg)",
                }}
              >
                <span
                  style={{ display: "flex", color: "var(--accent)" }}
                  aria-hidden="true"
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  >
                    <path d={row.swing} />
                  </svg>
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                    }}
                  >
                    {row.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {row.dir}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ask row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={PEND_QUESTION_PLACEHOLDER}
            aria-label="Pendulum question"
            data-pendulum-question
            style={{
              flex: 1,
              padding: "12px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 15,
            }}
          />
          <button
            type="button"
            onClick={ask}
            data-action="ask"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 20px",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            {PEND_ASK_LABEL}
          </button>
        </div>

        {/* Dial + answer */}
        <div
          data-dial-frame
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background:
              "linear-gradient(180deg, var(--bg-2), var(--bg-sunk))",
            padding: 30,
          }}
        >
          <PendulumDial answer={answer} />
          <div style={{ textAlign: "center" }}>
            <div
              data-pendulum-answer
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                color: answer === null ? "var(--ink-mute)" : "var(--accent)",
                lineHeight: 1,
              }}
            >
              {answer ?? "—"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                marginTop: 4,
              }}
            >
              {answer === null
                ? "Ask a question above to see the pendulum's answer."
                : PEND_DEFAULT_NOTE}
            </div>
          </div>
        </div>
      </div>

      {/* Session log rail */}
      <aside
        data-pendulum-log
        className="misc-rail"
        style={{
          flex: "none",
          width: 312,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: 20,
          alignSelf: "stretch",
        }}
      >
        <div style={{ ...EYEBROW, marginBottom: 12 }}>
          {PEND_SESSION_LOG_EYEBROW}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {log.length === 0 ? (
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
              }}
            >
              No sessions yet. Ask the pendulum a question above to
              begin the log.
            </div>
          ) : null}
          {log.map((entry, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: 11, alignItems: "flex-start" }}
              data-log-entry
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 42,
                  flex: "none",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                  padding: "2px 0",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-sm)",
                  textAlign: "center",
                }}
              >
                {entry.answer}
              </span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14,
                    color: "var(--ink-soft)",
                    lineHeight: 1.4,
                  }}
                >
                  {entry.question}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  {entry.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
