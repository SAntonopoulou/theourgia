/**
 * GroupRitualSchedulerSurface — H08 §S3 Cluster A surface 8.
 *
 * Faithful port of ``Theourgia Group Ritual Scheduler.dc.html``.
 * The **worked example** of the H08 sprint — introduces the
 * three-pin time trio (local | UTC | planetary hour) which the
 * brief treats as the deepest new structure of the whole tier.
 *
 * Honesty rules wired:
 *
 *   1. **The time trio is always THREE clocks** — the
 *      GroupRitualTimeTrio primitive enforces this; the surface
 *      cannot show one or two (rule 23).
 *   2. **The planetary hour is per-VIEWER** — the surface
 *      receives pre-computed values from the consumer; the
 *      caller derives them from the viewer's lat/long via Swiss
 *      Ephemeris. The component itself doesn't do timezone
 *      math.
 *   3. **Required correspondences are PREP, not lock-in.** The
 *      copy below the section heading is verbatim: "A prep
 *      checklist for each participant — not a lock-in."
 *   4. **"Schedule + invite" is `--warn-soft` (NEVER `--danger`)**
 *      — committing a shared rite to other practitioners'
 *      calendars is consequential, not destructive. Cross-
 *      instance invitations are ordinary federation, not a
 *      Visibility → Public step.
 *   5. **Free-form DID input is permitted** for invited-friends
 *      rituals — practitioners outside the hub can still be
 *      invited (rule 28 — federation is opt-in, not gated by
 *      hub membership).
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import {
  GroupRitualTimeTrio,
  type PlanetaryHourRuler,
} from "../GroupRitualTimeTrio/GroupRitualTimeTrio.js";

import {
  GRS_ADD_CORRESPONDENCE,
  GRS_CORRESPONDENCES_HELPER,
  GRS_LABEL_DESCRIPTION,
  GRS_LABEL_TITLE,
  GRS_LINK_SIGIL,
  GRS_LINK_VOCE,
  GRS_LOCATION_DISPERSED_HINT,
  GRS_LOCATION_LABELS,
  GRS_LOCATION_PHYSICAL_PLACEHOLDER,
  GRS_LOCATION_VIRTUAL_PLACEHOLDER,
  GRS_PARTICIPANTS_HELPER,
  GRS_PARTICIPANTS_PLACEHOLDER,
  GRS_SAVE_DRAFT,
  GRS_SCHEDULE_INVITE,
  GRS_SCRIPT_PLACEHOLDER,
  GRS_SECTION_BASICS,
  GRS_SECTION_CORRESPONDENCES,
  GRS_SECTION_LOCATION,
  GRS_SECTION_PARTICIPANTS,
  GRS_SECTION_SCRIPT,
  GRS_SECTION_TIME,
  GRS_SUBTITLE,
  GRS_TIME_HELPER,
  GRS_TITLE,
  type GroupRitualLocationKind,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface GroupRitualSchedulerSurfaceProps {
  /** Title input value — caller-controlled. */
  title: string;
  onTitleChange?: (next: string) => void;
  /** Description input — caller-controlled. */
  description: string;
  onDescriptionChange?: (next: string) => void;

  /** Local datetime-local value, e.g. ``"2026-03-20T06:12"``. */
  localDatetime: string;
  onLocalDatetimeChange?: (next: string) => void;

  /** Pre-computed display values for the time trio. The caller
   *  carries the localisation responsibility. */
  trio: {
    localPrimary: string;
    localSecondary: string;
    utcPrimary: string;
    utcSecondary: string;
    planetaryRuler: PlanetaryHourRuler;
    planetarySecondary: string;
    isCurrent: boolean;
  };

  /** Active location radio. */
  locationKind: GroupRitualLocationKind;
  onLocationKindChange?: (next: GroupRitualLocationKind) => void;
  /** Physical-address free text (rendered ONLY when locationKind
   *  is "physical"). */
  locationAddress?: string;
  onLocationAddressChange?: (next: string) => void;
  /** Virtual meeting URL (rendered ONLY when locationKind is
   *  "virtual"). */
  locationUrl?: string;
  onLocationUrlChange?: (next: string) => void;

  /** Current participant display labels (display names OR DIDs). */
  participants: readonly string[];
  /** Fires when a participant is removed via the chip's ×. */
  onRemoveParticipant?: (index: number) => void;
  /** Fires when a new participant is added (Enter in the input). */
  onAddParticipant?: (entry: string) => void;

  /** Correspondences list — caller-controlled. */
  correspondences: readonly string[];
  onAddCorrespondence?: () => void;
  onRemoveCorrespondence?: (index: number) => void;

  /** Shared script — caller-controlled. */
  script: string;
  onScriptChange?: (next: string) => void;

  /** Optional onClick handlers for the link-sigil / link-voce
   *  picker affordances. */
  onLinkSigil?: () => void;
  onLinkVoce?: () => void;

  /** Footer CTAs. Schedule + invite uses --warn-soft chrome. */
  onSaveDraft?: () => void;
  onScheduleInvite?: () => void;

  className?: string;
  style?: CSSProperties;
}

// ─── Style atoms ───────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "28px 26px 60px",
};

const INNER: CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 26,
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  marginBottom: 14,
};

const SECTION_DIVIDER: CSSProperties = {
  borderTop: "1px solid var(--line)",
  paddingTop: 22,
};

const FIELD_LABEL: CSSProperties = {
  display: "block",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const INPUT: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 16,
};

const TEXTAREA: CSSProperties = {
  ...INPUT,
  fontSize: 14.5,
  lineHeight: 1.5,
  resize: "vertical",
};

const LOC_BTN_BASE: CSSProperties = {
  padding: "8px 15px",
  borderRadius: "var(--r-md)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  background: "var(--bg-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const LOC_BTN_ON: CSSProperties = {
  ...LOC_BTN_BASE,
  color: "var(--ink)",
  background: "var(--network-soft)",
  borderColor: "var(--network)",
};

const PARTICIPANTS_WRAP: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  padding: "9px 11px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const PARTICIPANT_CHIP: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: "999px",
  background: "var(--network-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink)",
};

const CORR_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const ADD_CORR_BTN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "9px 12px",
  border: "1px dashed var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const FOOTER: CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  borderTop: "1px solid var(--line)",
  paddingTop: 20,
};

const SAVE_DRAFT_BTN: CSSProperties = {
  padding: "11px 18px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--line-2)",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 14,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const SCHEDULE_BTN: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 22px",
  borderRadius: "var(--r-md)",
  background: "var(--warn-soft)",
  border: "1px solid var(--warn-border)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 14,
  color: "var(--ink)",
  cursor: "pointer",
};

// ─── Glyphs ────────────────────────────────────────────────────────

function PlusGlyph(): ReactNode {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function RemoveGlyph(): ReactNode {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckGlyph(): ReactNode {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function GroupRitualSchedulerSurface(
  props: GroupRitualSchedulerSurfaceProps,
) {
  const titleId = useId();
  const {
    title,
    onTitleChange,
    description,
    onDescriptionChange,
    localDatetime,
    onLocalDatetimeChange,
    trio,
    locationKind,
    onLocationKindChange,
    locationAddress = "",
    onLocationAddressChange,
    locationUrl = "",
    onLocationUrlChange,
    participants,
    onRemoveParticipant,
    onAddParticipant,
    correspondences,
    onAddCorrespondence,
    onRemoveCorrespondence,
    script,
    onScriptChange,
    onLinkSigil,
    onLinkVoce,
    onSaveDraft,
    onScheduleInvite,
    className,
    style,
  } = props;
  const [participantDraft, setParticipantDraft] = useState("");

  function commitParticipant() {
    const v = participantDraft.trim();
    if (!v) return;
    onAddParticipant?.(v);
    setParticipantDraft("");
  }

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="group-ritual-scheduler"
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {GRS_TITLE}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
              marginTop: 2,
            }}
          >
            {GRS_SUBTITLE}
          </div>
        </div>
      </header>

      <div className="scroll" style={MAIN}>
        <div style={INNER}>
          {/* S1 Basics */}
          <section data-section="basics">
            <div style={SECTION_HEADING}>{GRS_SECTION_BASICS}</div>
            <label htmlFor="grs-title" style={FIELD_LABEL}>
              {GRS_LABEL_TITLE}
            </label>
            <input
              id="grs-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.currentTarget.value)}
              data-field="title"
              style={{ ...INPUT, marginBottom: 14 }}
            />
            <label htmlFor="grs-desc" style={FIELD_LABEL}>
              {GRS_LABEL_DESCRIPTION}
            </label>
            <textarea
              id="grs-desc"
              rows={2}
              value={description}
              onChange={(e) =>
                onDescriptionChange?.(e.currentTarget.value)
              }
              data-field="description"
              style={TEXTAREA}
            />
          </section>

          {/* S2 Time — THE THREE-PIN TRIO */}
          <section style={SECTION_DIVIDER} data-section="time">
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                marginBottom: 6,
              }}
            >
              {GRS_SECTION_TIME}
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 14px",
              }}
            >
              {GRS_TIME_HELPER}
            </p>
            <input
              type="datetime-local"
              value={localDatetime}
              onChange={(e) =>
                onLocalDatetimeChange?.(e.currentTarget.value)
              }
              data-field="local-datetime"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                marginBottom: 14,
              }}
            />
            <GroupRitualTimeTrio {...trio} />
          </section>

          {/* S3 Location */}
          <section style={SECTION_DIVIDER} data-section="location">
            <div style={SECTION_HEADING}>{GRS_SECTION_LOCATION}</div>
            <div
              role="radiogroup"
              aria-label={GRS_SECTION_LOCATION}
              style={{ display: "flex", gap: 8, marginBottom: 12 }}
            >
              {(
                ["physical", "virtual", "dispersed"] as const
              ).map((k) => {
                const on = locationKind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onLocationKindChange?.(k)}
                    aria-pressed={on}
                    data-location-kind={k}
                    style={on ? LOC_BTN_ON : LOC_BTN_BASE}
                  >
                    {GRS_LOCATION_LABELS[k]}
                  </button>
                );
              })}
            </div>
            {locationKind === "dispersed" ? (
              <div
                data-field="dispersed-hint"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                }}
              >
                {GRS_LOCATION_DISPERSED_HINT}
              </div>
            ) : null}
            {locationKind === "physical" ? (
              <input
                type="text"
                placeholder={GRS_LOCATION_PHYSICAL_PLACEHOLDER}
                value={locationAddress}
                onChange={(e) =>
                  onLocationAddressChange?.(e.currentTarget.value)
                }
                data-field="address"
                style={{ ...INPUT, fontSize: 14.5 }}
              />
            ) : null}
            {locationKind === "virtual" ? (
              <input
                type="text"
                placeholder={GRS_LOCATION_VIRTUAL_PLACEHOLDER}
                value={locationUrl}
                onChange={(e) =>
                  onLocationUrlChange?.(e.currentTarget.value)
                }
                data-field="url"
                style={{
                  ...INPUT,
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                }}
              />
            ) : null}
          </section>

          {/* S4 Participants */}
          <section style={SECTION_DIVIDER} data-section="participants">
            <div style={SECTION_HEADING}>{GRS_SECTION_PARTICIPANTS}</div>
            <div style={PARTICIPANTS_WRAP}>
              {participants.map((p, idx) => (
                <span
                  key={`${p}-${idx}`}
                  style={PARTICIPANT_CHIP}
                  data-participant={p}
                >
                  {p}
                  <button
                    type="button"
                    aria-label={`Remove ${p}`}
                    onClick={() => onRemoveParticipant?.(idx)}
                    data-action="remove-participant"
                    style={{
                      display: "flex",
                      color: "var(--ink-mute)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <RemoveGlyph />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={participantDraft}
                onChange={(e) =>
                  setParticipantDraft(e.currentTarget.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitParticipant();
                  }
                }}
                placeholder={GRS_PARTICIPANTS_PLACEHOLDER}
                data-field="participant-input"
                style={{
                  flex: 1,
                  minWidth: 160,
                  border: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  padding: 4,
                  outline: "none",
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
                margin: "9px 0 0",
              }}
            >
              {GRS_PARTICIPANTS_HELPER}
            </p>
          </section>

          {/* S5 Correspondences */}
          <section
            style={SECTION_DIVIDER}
            data-section="correspondences"
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                marginBottom: 6,
              }}
            >
              {GRS_SECTION_CORRESPONDENCES}
            </div>
            <p
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--ink-mute)",
                margin: "0 0 12px",
              }}
              data-field="correspondences-helper"
            >
              {GRS_CORRESPONDENCES_HELPER}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              {correspondences.map((c, idx) => (
                <div
                  key={`${c}-${idx}`}
                  style={CORR_ROW}
                  data-correspondence={c}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--network)",
                      flex: "none",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                      flex: 1,
                    }}
                  >
                    {c}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${c}`}
                    onClick={() => onRemoveCorrespondence?.(idx)}
                    data-action="remove-correspondence"
                    style={{
                      display: "flex",
                      color: "var(--ink-mute)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <RemoveGlyph />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={onAddCorrespondence}
                data-action="add-correspondence"
                style={ADD_CORR_BTN}
              >
                <PlusGlyph />
                {GRS_ADD_CORRESPONDENCE}
              </button>
            </div>
          </section>

          {/* S6+S7 Shared script + sigils/voces */}
          <section style={SECTION_DIVIDER} data-section="script">
            <div style={SECTION_HEADING}>{GRS_SECTION_SCRIPT}</div>
            <textarea
              rows={3}
              value={script}
              onChange={(e) => onScriptChange?.(e.currentTarget.value)}
              placeholder={GRS_SCRIPT_PLACEHOLDER}
              data-field="script"
              style={{ ...TEXTAREA, fontSize: 15, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onLinkSigil}
                data-action="link-sigil"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 13px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "transparent",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-glyph)",
                    color: "var(--accent)",
                  }}
                  aria-hidden="true"
                >
                  ✦
                </span>
                {GRS_LINK_SIGIL}
              </button>
              <button
                type="button"
                onClick={onLinkVoce}
                data-action="link-voce"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 13px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "transparent",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-glyph)",
                    color: "var(--accent)",
                  }}
                  aria-hidden="true"
                >
                  ☽
                </span>
                {GRS_LINK_VOCE}
              </button>
            </div>
          </section>

          {/* Footer */}
          <div style={FOOTER}>
            <button
              type="button"
              onClick={onSaveDraft}
              data-action="save-draft"
              style={SAVE_DRAFT_BTN}
            >
              {GRS_SAVE_DRAFT}
            </button>
            <button
              type="button"
              onClick={onScheduleInvite}
              data-action="schedule-invite"
              style={SCHEDULE_BTN}
            >
              <CheckGlyph />
              {GRS_SCHEDULE_INVITE}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
