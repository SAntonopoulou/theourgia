/**
 * BanishingPanel — single-column log composer with the optional
 * Seal-on-device toggle.
 *
 * Verbatim from `Theourgia Practice Logs.dc.html` lines 228-258. The
 * Seal toggle uses --seal* (care palette); the help text differs by
 * state and is load-bearing client-side-signing UX (cross-cutting
 * H01-H03 pattern). Never red — opting into encryption is a positive
 * affordance, not a danger.
 */

import { type CSSProperties, useState } from "react";

import {
  BANISH_DEFAULT_LOG,
  BANISH_LOG_LABEL,
  BANISH_NOTE_PLACEHOLDER,
  BANISH_RECENT_EYEBROW,
  BANISH_RITE_OPTIONS,
  BANISH_SEAL_ACTIVE_LABEL,
  BANISH_SEAL_HELP_OFF,
  BANISH_SEAL_HELP_ON,
  BANISH_SEAL_LABEL,
  BANISH_SEALED_PILL,
  BANISH_TIME_DEFAULT,
  type BanishingLogEntry,
} from "./copy.js";

const PLUS_ICON = (
  <svg
    width={15}
    height={15}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const CHEVRON_ICON = (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const LOCK_ICON = (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x={5} y={11} width={14} height={9} rx={2} />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const UNLOCK_ICON = (
  <svg
    width={13}
    height={13}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x={5} y={11} width={14} height={9} rx={2} />
    <path d="M8 11V8a4 4 0 0 1 7.5-1.8" />
  </svg>
);

const SEAL_PILL_ICON = (
  <svg
    width={11}
    height={11}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x={5} y={11} width={14} height={9} rx={2} />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const SEAL_BUTTON_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const SEAL_BUTTON_ON: CSSProperties = {
  ...SEAL_BUTTON_BASE,
  color: "var(--seal)",
  background: "var(--seal-soft)",
  borderColor: "var(--seal-border)",
};

export interface BanishingPanelProps {
  initialRite?: string;
  initialTime?: string;
  initialNote?: string;
  initialSealOn?: boolean;
  recent?: readonly BanishingLogEntry[];
  onSave?: (payload: {
    rite: string;
    time: string;
    note: string;
    sealed: boolean;
  }) => void;
  className?: string;
  style?: CSSProperties;
}

export function BanishingPanel({
  initialRite = BANISH_RITE_OPTIONS[0]!,
  initialTime = BANISH_TIME_DEFAULT,
  initialNote = "",
  initialSealOn = false,
  recent = BANISH_DEFAULT_LOG,
  onSave,
  className,
  style,
}: BanishingPanelProps) {
  const [rite, setRite] = useState(initialRite);
  const [time, setTime] = useState(initialTime);
  const [note, setNote] = useState(initialNote);
  const [sealOn, setSealOn] = useState(initialSealOn);

  const handleSave = () => {
    onSave?.({ rite, time, note, sealed: sealOn });
  };

  return (
    <div
      data-component="banishing-panel"
      data-seal-on={sealOn}
      className={className}
      style={{ maxWidth: 760, ...style }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "14px 16px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line-2)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 200px",
            minWidth: 0,
          }}
        >
          <select
            value={rite}
            onChange={(e) => setRite(e.target.value)}
            aria-label="Rite"
            data-banish-rite
            style={{
              width: "100%",
              padding: "11px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              appearance: "none",
            }}
          >
            {BANISH_RITE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span
            style={{
              position: "absolute",
              right: 13,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--ink-mute)",
            }}
          >
            {CHEVRON_ICON}
          </span>
        </div>
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="Time"
          data-banish-time
          style={{
            width: 78,
            padding: "11px 12px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            textAlign: "center",
          }}
        />
        <button
          type="button"
          aria-pressed={sealOn}
          data-action="toggle-seal"
          onClick={() => setSealOn((v) => !v)}
          style={sealOn ? SEAL_BUTTON_ON : SEAL_BUTTON_BASE}
        >
          <span style={{ display: "flex" }} aria-hidden="true">
            {sealOn ? LOCK_ICON : UNLOCK_ICON}
          </span>
          {sealOn ? BANISH_SEAL_ACTIVE_LABEL : BANISH_SEAL_LABEL}
        </button>
        <button
          type="button"
          data-action="save-banishing"
          onClick={handleSave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "11px 18px",
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
          {PLUS_ICON}
          {BANISH_LOG_LABEL}
        </button>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={BANISH_NOTE_PLACEHOLDER}
        aria-label="Optional note"
        data-banish-note
        style={{
          width: "100%",
          padding: "11px 14px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--line)",
          borderRadius: "var(--r-md)",
          background: "var(--bg-2)",
          color: "var(--ink)",
          fontFamily: "var(--font-serif)",
          fontSize: 14.5,
          marginBottom: 8,
        }}
      />
      <p
        data-seal-help
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
          margin: "0 0 24px",
        }}
      >
        {sealOn ? BANISH_SEAL_HELP_ON : BANISH_SEAL_HELP_OFF}
      </p>

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
        {BANISH_RECENT_EYEBROW}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {recent.map((entry, i) => (
          <div
            key={`${entry.when}-${i}`}
            data-recent-entry
            data-sealed={entry.sealed}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "13px 4px",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--line)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--ink-mute)",
                width: 96,
                flex: "none",
              }}
            >
              {entry.when}
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                color: "var(--ink)",
              }}
            >
              {entry.rite}
            </span>
            {entry.sealed ? (
              <span
                data-sealed-pill
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--seal-border)",
                  borderRadius: "var(--r-pill, 20px)",
                  background: "var(--seal-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--seal)",
                }}
              >
                {SEAL_PILL_ICON}
                {BANISH_SEALED_PILL}
              </span>
            ) : null}
            {entry.note ? (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--ink-mute)",
                  maxWidth: 220,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entry.note}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
