/**
 * AsanaPanel — āsana + breath ratio + practice timer + stats rail.
 *
 * Verbatim from `Theourgia Practice Logs.dc.html` lines 181-226. The
 * timer is a simple seconds counter that ticks every 1s while
 * `running` is true. Quiet stats — "41.5 hours, cumulative" and
 * "88 sessions kept" — are present but never gamified per H04
 * cross-cutting rule.
 */

import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ASANA_BEGIN_LABEL,
  ASANA_BREATH_DEFAULT,
  ASANA_BREATH_LABEL,
  ASANA_DEFAULT_LOG,
  ASANA_DEFAULT_NAME,
  ASANA_LABEL,
  ASANA_NOTES_DEFAULT,
  ASANA_NOTES_LABEL,
  ASANA_NOTES_PLACEHOLDER,
  ASANA_PAUSE_LABEL,
  ASANA_RECENT_EYEBROW,
  ASANA_RESET_LABEL,
  ASANA_SAVE_LABEL,
  ASANA_STAT_HOURS,
  ASANA_STAT_HOURS_LABEL,
  ASANA_STAT_SESSIONS,
  ASANA_STAT_SESSIONS_LABEL,
  ASANA_TIMER_DEFAULT_SECONDS,
  type AsanaLogEntry,
  formatTimerSeconds,
} from "./copy.js";

const SAVE_ICON = (
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

const EYEBROW_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const INPUT_BASE: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
};

export interface AsanaPanelProps {
  initialName?: string;
  initialBreath?: string;
  initialSeconds?: number;
  initialNotes?: string;
  recent?: readonly AsanaLogEntry[];
  /** Optional override of Date.now for tests. */
  now?: () => number;
  onSave?: (payload: {
    name: string;
    breath: string;
    seconds: number;
    notes: string;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

export function AsanaPanel({
  initialName = ASANA_DEFAULT_NAME,
  initialBreath = ASANA_BREATH_DEFAULT,
  initialSeconds = ASANA_TIMER_DEFAULT_SECONDS,
  initialNotes = ASANA_NOTES_DEFAULT,
  recent = ASANA_DEFAULT_LOG,
  now = Date.now,
  onSave,
  className,
  style,
}: AsanaPanelProps) {
  const [name, setName] = useState(initialName);
  const [breath, setBreath] = useState(initialBreath);
  const [notes, setNotes] = useState(initialNotes);
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const startSeconds = useRef(seconds);

  useEffect(() => {
    if (!running) return;
    startedAt.current = now();
    startSeconds.current = seconds;
    const tick = () => {
      const start = startedAt.current;
      if (start == null) return;
      setSeconds(startSeconds.current + Math.floor((now() - start) / 1000));
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // We intentionally only want this effect to fire when `running`
    // flips. Capturing seconds at start lets the interval add elapsed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleToggle = () => setRunning((v) => !v);
  const handleReset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
  };
  const handleSave = () => {
    onSave?.({ name, breath, seconds, notes });
  };

  return (
    <div
      data-component="asana-panel"
      className={`log-cols ${className ?? ""}`}
      style={{
        display: "flex",
        gap: 26,
        alignItems: "flex-start",
        ...style,
      }}
    >
      {/* Main column */}
      <div
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <label htmlFor="asana-name" style={EYEBROW_STYLE}>
              {ASANA_LABEL}
            </label>
            <input
              id="asana-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-asana-name
              style={{
                ...INPUT_BASE,
                fontFamily: "var(--font-serif)",
                fontSize: 15,
              }}
            />
          </div>
          <div style={{ flex: "1 1 130px", minWidth: 0 }}>
            <label htmlFor="asana-breath" style={EYEBROW_STYLE}>
              {ASANA_BREATH_LABEL}
            </label>
            <input
              id="asana-breath"
              type="text"
              value={breath}
              onChange={(e) => setBreath(e.target.value)}
              data-asana-breath
              style={{
                ...INPUT_BASE,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <div
          data-asana-timer
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            padding: 24,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg)",
            marginBottom: 18,
          }}
        >
          <div
            data-timer-text
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 46,
              color: "var(--ink)",
              letterSpacing: "0.04em",
            }}
          >
            {formatTimerSeconds(seconds)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              data-action="toggle-timer"
              aria-pressed={running}
              onClick={handleToggle}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
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
              {running ? ASANA_PAUSE_LABEL : ASANA_BEGIN_LABEL}
            </button>
            <button
              type="button"
              data-action="reset-timer"
              onClick={handleReset}
              style={{
                padding: "10px 16px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-soft)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {ASANA_RESET_LABEL}
            </button>
          </div>
        </div>

        <label htmlFor="asana-notes" style={EYEBROW_STYLE}>
          {ASANA_NOTES_LABEL}
        </label>
        <textarea
          id="asana-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={ASANA_NOTES_PLACEHOLDER}
          data-asana-notes
          style={{
            ...INPUT_BASE,
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            lineHeight: 1.5,
            resize: "vertical",
            marginBottom: 18,
          }}
        />

        <button
          type="button"
          data-action="save-asana"
          onClick={handleSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
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
          {ASANA_SAVE_LABEL}
        </button>
      </div>

      {/* Stats + recent rail */}
      <aside
        className="log-rail"
        style={{
          flex: "none",
          width: 300,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg-2)",
          padding: 20,
          alignSelf: "stretch",
        }}
      >
        <div style={{ display: "flex", gap: 18, marginBottom: 18 }}>
          <div data-stat="hours">
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              {ASANA_STAT_HOURS}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginTop: 3,
              }}
            >
              {ASANA_STAT_HOURS_LABEL}
            </div>
          </div>
          <div data-stat="sessions">
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                lineHeight: 1,
              }}
            >
              {ASANA_STAT_SESSIONS}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-mute)",
                marginTop: 3,
              }}
            >
              {ASANA_STAT_SESSIONS_LABEL}
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          {ASANA_RECENT_EYEBROW}
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 11 }}
        >
          {recent.map((entry, i) => (
            <div
              key={`${entry.date}-${i}`}
              data-recent-entry
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  width: 42,
                  flex: "none",
                }}
              >
                {entry.date}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-serif)",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                }}
              >
                {entry.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--accent)",
                }}
              >
                {entry.dur}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
