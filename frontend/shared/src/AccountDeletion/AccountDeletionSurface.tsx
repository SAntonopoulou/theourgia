/**
 * AccountDeletion — H10 Cluster B3 surface.
 *
 * Three-step confirmation: type magickal name verbatim · type start
 * date verbatim · tap Schedule deletion. The Schedule button is
 * `--warn-soft` (rule 2 — NEVER --danger).
 *
 * The memorial-interaction block appears only when the user has
 * designated an executor (per the digital-inheritance flow in B1).
 *
 * Once scheduled, the surface flips to a reactivation banner state
 * via the parent — this component just renders the form + emits
 * onSchedule when the three-step confirmation matches.
 */

import { useState, type CSSProperties } from "react";

import {
  BUTTONS,
  FACTS,
  FIELD_LABELS,
  HEADERS,
  MEMORIAL_INTERACTION,
  RETENTION_LINE,
} from "./copy.js";

export interface AccountDeletionSurfaceProps {
  /** The magickal name to confirm against. */
  magickalName: string;
  /** Start date string (YYYY-MM-DD) to confirm against. */
  startDate: string;
  /** Show the memorial-mode interaction block above confirm. */
  hasExecutor?: boolean;
  /** When true, the schedule button is disabled (e.g., mutation in flight). */
  busy?: boolean;
  onSchedule?: () => void;
  onKeepVault?: () => void;
  className?: string;
  style?: CSSProperties;
}

const PAGE: CSSProperties = {
  maxWidth: 580,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

export function AccountDeletionSurface({
  magickalName,
  startDate,
  hasExecutor = false,
  busy = false,
  onSchedule,
  onKeepVault,
  className,
  style,
}: AccountDeletionSurfaceProps) {
  const [typedName, setTypedName] = useState("");
  const [typedDate, setTypedDate] = useState("");

  const namesMatch = typedName.trim() === magickalName.trim();
  const datesMatch = typedDate.trim() === startDate.trim();
  const canSchedule = namesMatch && datesMatch && !busy;

  return (
    <div className={className} style={{ ...PAGE, ...style }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 11,
        }}
      >
        {HEADERS.whatThisDoes}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          marginBottom: 24,
        }}
      >
        {FACTS.map((f, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--ink-mute)",
                flex: "none",
                marginTop: 8,
              }}
            />
            <span>{f}</span>
          </div>
        ))}
      </div>

      {hasExecutor ? (
        <div
          role="note"
          style={{
            display: "flex",
            gap: 12,
            padding: "14px 16px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--seal-border)",
            borderRadius: "var(--r-md)",
            background: "var(--seal-soft)",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              display: "flex",
              color: "var(--seal)",
              flex: "none",
              marginTop: 1,
            }}
            aria-hidden="true"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a6 6 0 0 0-6 6v8h12V9a6 6 0 0 0-6-6z" />
              <path d="M4 21h16M9 13h6" />
            </svg>
          </span>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink)",
              lineHeight: 1.55,
            }}
          >
            {MEMORIAL_INTERACTION}
          </div>
        </div>
      ) : null}

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          color: "var(--ink)",
          marginBottom: 13,
        }}
      >
        {HEADERS.confirm}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 6,
            }}
          >
            {FIELD_LABELS.magickalName} —{" "}
            <span
              style={{
                fontFamily: "var(--font-serif)",
                color: "var(--ink)",
              }}
            >
              {magickalName}
            </span>
          </span>
          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={magickalName}
            aria-label={FIELD_LABELS.magickalName}
            style={{
              width: "100%",
              padding: "10px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
            }}
          />
        </label>
        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
              marginBottom: 6,
            }}
          >
            {FIELD_LABELS.startedDate} —{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              {startDate}
            </span>
          </span>
          <input
            type="text"
            value={typedDate}
            onChange={(e) => setTypedDate(e.target.value)}
            placeholder={startDate}
            aria-label={FIELD_LABELS.startedDate}
            style={{
              width: 200,
              padding: "10px 13px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "flex-end",
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopStyle: "solid",
          borderTopColor: "var(--line)",
        }}
      >
        <button
          type="button"
          onClick={onKeepVault}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13.5,
            color: "var(--ink-mute)",
            marginRight: "auto",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {BUTTONS.keep}
        </button>
        <button
          type="button"
          disabled={!canSchedule}
          onClick={() => onSchedule?.()}
          style={{
            padding: "11px 20px",
            borderRadius: "var(--r-md)",
            background: "var(--warn-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--warn-border)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--warn)",
            cursor: canSchedule ? "pointer" : "not-allowed",
            opacity: canSchedule ? 1 : 0.5,
          }}
        >
          {BUTTONS.schedule}
        </button>
      </div>

      <div
        style={{
          marginTop: 22,
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          lineHeight: 1.6,
        }}
      >
        {RETENTION_LINE}
      </div>
    </div>
  );
}
