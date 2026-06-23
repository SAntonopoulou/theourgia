/**
 * DefinePracticeDrawer — right-side drawer for defining a new practice.
 *
 * Verbatim from `Theourgia Daily Practice Tracker.dc.html` lines
 * 211-253. Form fields:
 *   • Name (text input)
 *   • Cadence (chip group, 6 options)
 *   • Intention (optional textarea)
 *   • Linked being (optional select)
 *   • Also schedule as a recurring offering (switch row)
 *
 * Open state is controlled by the parent so this surface can be
 * keyboard-trapped + ESC-dismissed at the AppShell layer.
 */

import { type CSSProperties, type ReactNode, useState } from "react";

import {
  CADENCE_OPTIONS,
  type CadenceOption,
} from "./copy.js";

/** Submitted shape from the drawer. The parent persists this; backend
 *  acceptance lives in the Daily Practice API (`POST /api/v1/practices`). */
export interface DefinePracticeDraft {
  name: string;
  cadence: CadenceOption;
  intention: string;
  linkedBeing: string | null;
  alsoScheduleOffering: boolean;
}

export interface DefinePracticeDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the draft when the user clicks Save practice. */
  onSave?: (draft: DefinePracticeDraft) => void;
  /** Optional list of beings (entities) to populate the Linked-being
   *  select. Always includes a leading "None" entry. */
  beings?: readonly string[];
  /** Initial draft values. Defaults match the mockup. */
  initial?: Partial<DefinePracticeDraft>;
}

const LABEL_STYLE: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const OPTIONAL_STYLE: CSSProperties = {
  textTransform: "none",
  letterSpacing: 0,
  color: "var(--ink-mute)",
  fontSize: 11,
};

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  marginBottom: 20,
};

const CHIP_BASE: CSSProperties = {
  padding: "7px 13px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const CHIP_ON: CSSProperties = {
  ...CHIP_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--accent)",
};

const SELECT_WRAP: CSSProperties = {
  position: "relative",
  marginBottom: 22,
};

const SELECT_STYLE: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  appearance: "none",
};

const CARET = (
  <span
    style={{
      position: "absolute",
      right: 13,
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--ink-mute)",
    }}
    aria-hidden="true"
  >
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </span>
);

const CLOSE_ICON = (
  <svg
    width={17}
    height={17}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const SWITCH_TRACK: CSSProperties = {
  width: 36,
  height: 20,
  borderRadius: 11,
  background: "var(--bg-3)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  position: "relative",
  flex: "none",
  marginTop: 1,
  display: "inline-block",
};

const SWITCH_KNOB_OFF: CSSProperties = {
  position: "absolute",
  top: 1,
  left: 1,
  width: 16,
  height: 16,
  borderRadius: "50%",
  background: "var(--ink-mute)",
  transition: "left .15s ease, background-color .15s ease",
};

const SWITCH_KNOB_ON: CSSProperties = {
  ...SWITCH_KNOB_OFF,
  left: 17,
  background: "var(--accent)",
};

export function DefinePracticeDrawer({
  open,
  onClose,
  onSave,
  beings = [],
  initial,
}: DefinePracticeDrawerProps) {
  // Default values mirror the mockup (line 222 etc).
  const [name, setName] = useState(initial?.name ?? "Evening banishing");
  const [cadence, setCadence] = useState<CadenceOption>(
    initial?.cadence ?? "before-sleep",
  );
  const [intention, setIntention] = useState(
    initial?.intention ?? "Clear the room before rest.",
  );
  const [linkedBeing, setLinkedBeing] = useState<string | null>(
    initial?.linkedBeing ?? null,
  );
  const [alsoSchedule, setAlsoSchedule] = useState(
    initial?.alsoScheduleOffering ?? false,
  );

  if (!open) return null;

  const submit = () => {
    onSave?.({
      name,
      cadence,
      intention,
      linkedBeing,
      alsoScheduleOffering: alsoSchedule,
    });
  };

  const beingsList = beings.length > 0 ? beings : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Define a practice"
      data-component="define-practice-drawer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        data-scrim
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.5)",
        }}
      />
      <div
        className="scroll"
        style={{
          position: "relative",
          width: "min(440px, 100%)",
          height: "100%",
          overflowY: "auto",
          background: "var(--bg)",
          borderLeftWidth: 1,
          borderLeftStyle: "solid",
          borderLeftColor: "var(--line-2)",
          boxShadow: "-2px 0 30px rgba(0,0,0,.4)",
          padding: "24px 26px 40px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              margin: 0,
            }}
          >
            Define a practice
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              color: "var(--ink-mute)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {CLOSE_ICON}
          </button>
        </div>

        {/* Name */}
        <label style={LABEL_STYLE} htmlFor="dp-name">
          Name
        </label>
        <input
          id="dp-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={INPUT_STYLE}
        />

        {/* Cadence */}
        <label style={LABEL_STYLE}>Cadence</label>
        <div
          role="group"
          aria-label="Cadence"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 7,
            marginBottom: 20,
          }}
        >
          {CADENCE_OPTIONS.map((opt) => {
            const on = cadence === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={on}
                onClick={() => setCadence(opt.key)}
                style={on ? CHIP_ON : CHIP_BASE}
                data-cadence={opt.key}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Intention */}
        <label style={LABEL_STYLE} htmlFor="dp-intention">
          Intention <span style={OPTIONAL_STYLE}>· optional</span>
        </label>
        <textarea
          id="dp-intention"
          rows={2}
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder="What this practice is for, in your own words"
          style={{ ...INPUT_STYLE, resize: "vertical" }}
        />

        {/* Linked being */}
        <label style={LABEL_STYLE} htmlFor="dp-being">
          Linked being{" "}
          <span style={OPTIONAL_STYLE}>· optional</span>
        </label>
        <div style={SELECT_WRAP}>
          <select
            id="dp-being"
            value={linkedBeing ?? ""}
            onChange={(e) =>
              setLinkedBeing(e.target.value === "" ? null : e.target.value)
            }
            style={SELECT_STYLE}
          >
            <option value="">None</option>
            {beingsList.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          {CARET}
        </div>

        {/* Recurring-offering switch row */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: "13px 15px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            cursor: "pointer",
            marginBottom: 26,
          }}
        >
          <span
            role="switch"
            aria-checked={alsoSchedule}
            aria-label="Also schedule"
            onClick={() => setAlsoSchedule((v) => !v)}
            style={SWITCH_TRACK}
            data-also-schedule={alsoSchedule}
          >
            <span style={alsoSchedule ? SWITCH_KNOB_ON : SWITCH_KNOB_OFF} />
          </span>
          <span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 13.5,
                color: "var(--ink)",
              }}
            >
              Also schedule as a recurring offering
            </span>
            <br />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              Adds a matching entry to the Offerings ledger on the same
              cadence.
            </span>
          </span>
          <input
            type="checkbox"
            checked={alsoSchedule}
            onChange={(e) => setAlsoSchedule(e.target.checked)}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </label>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: "var(--r-md)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            style={{
              flex: 1,
              padding: 12,
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
            Save practice
          </button>
        </div>
      </div>
    </div>
  );
}

export type { ReactNode };
