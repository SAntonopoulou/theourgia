/**
 * ActivePracticeCard — rail card for a recurring offering.
 *
 * Per `Theourgia Offerings.dc.html`. Each card shows the practice
 * label (display serif), the entity name + cadence, a due hint
 * chip (color shifts to --accent when due "soon"), a pause/resume
 * switch on the right, and a Record action that triggers the
 * offering drawer pre-filled for this practice.
 *
 * Paused practices dim to 0.62 opacity and the due-chip greys out
 * — the rule is calm, never blaming. No --danger.
 */

import { type CSSProperties, type ReactNode } from "react";

export interface ActivePractice {
  id: string;
  /** Display name ("Hekate's Deipnon"). */
  label: string;
  /** Entity name (display only — the surface owns linking). */
  entityName: string;
  /** Free-text cadence ("Every dark moon", "Daily at dawn"). */
  cadence: string;
  /** Due hint string ("Due in 2 days", "Tomorrow · 06:00"). */
  due: string;
  /** Whether the due hint should be rendered as "soon" (accent tone). */
  soon?: boolean;
  /** Whether the practice is currently active (toggle is on). */
  active: boolean;
}

export interface ActivePracticeCardProps {
  practice: ActivePractice;
  onTogglePause?: (next: boolean) => void;
  onRecord?: () => void;
  /** Optional pre-rendered icon slot (defaults to none). */
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function trackStyle(on: boolean): CSSProperties {
  return {
    width: 36,
    height: 22,
    flex: "none",
    borderRadius: 999,
    padding: 2,
    background: on ? "var(--accent)" : "var(--bg-sunk)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--line-2)",
    display: "inline-flex",
    justifyContent: on ? "flex-end" : "flex-start",
    cursor: "pointer",
    transition: "all 0.18s ease",
  };
}

function knobStyle(on: boolean): CSSProperties {
  return {
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: on ? "var(--accent-ink)" : "var(--ink-mute)",
    display: "block",
    transition: "all 0.18s ease",
  };
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ActivePracticeCard({
  practice,
  onTogglePause,
  onRecord,
  icon,
  className,
  style,
}: ActivePracticeCardProps) {
  const dueColor = practice.soon ? "var(--accent)" : "var(--ink-mute)";
  return (
    <article
      className={className}
      data-component="active-practice-card"
      data-practice-id={practice.id}
      data-active={practice.active ? "true" : "false"}
      style={{
        padding: "13px 14px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: practice.soon ? "var(--line-2)" : "var(--line)",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--bg-2)",
        opacity: practice.active ? 1 : 0.62,
        transition: "opacity 0.15s ease",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
        }}
      >
        {icon ? <span style={{ flex: "none" }}>{icon}</span> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15.5,
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            {practice.label}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {practice.entityName} · {practice.cadence}
          </div>
        </div>
        {onTogglePause ? (
          <button
            type="button"
            role="switch"
            aria-checked={practice.active}
            aria-label={
              practice.active
                ? `Pause ${practice.label}`
                : `Resume ${practice.label}`
            }
            onClick={() => onTogglePause(!practice.active)}
            data-pause-switch
            style={trackStyle(practice.active)}
          >
            <span style={knobStyle(practice.active)} />
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 11,
        }}
      >
        <span
          data-due-chip
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 9px",
            borderRadius: 999,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: dueColor,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: practice.soon ? "var(--accent)" : "var(--line)",
            background: practice.soon
              ? "var(--accent-soft)"
              : "var(--bg-sunk)",
          }}
        >
          {practice.due}
        </span>
        {onRecord ? (
          <button
            type="button"
            onClick={onRecord}
            data-record-button
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: 7,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <PlusIcon />
            Record
          </button>
        ) : null}
      </div>
    </article>
  );
}
