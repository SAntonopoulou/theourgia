/**
 * GroupRitualCoordinationSurface — H08 §S3 Cluster A surface 9.
 *
 * Faithful port of ``Theourgia Group Ritual Coordination.dc.html``.
 * The in-the-moment surface participants land on during a
 * scheduled ritual. Narrow-optimised (~600px) since participants
 * may use phones.
 *
 * Honesty rules wired:
 *
 *   1. **Time trio compact-mode pinned at top** — local | UTC |
 *      planetary hour (rule 23). Same three-pin discipline as the
 *      Scheduler, but the compact format suits the smaller frame.
 *   2. **Fragments are append-only with a 60-second edit
 *      window.** The footer input commits on Enter or "Post"
 *      click; existing fragments display without affordances to
 *      edit. (The 60s timer is the consumer's responsibility —
 *      this surface only renders the post-and-go affordance.)
 *   3. **"Mark me as completed" is one-way.** Once clicked, the
 *      consumer transitions the viewer's presence to "completed"
 *      and the CTA disappears. The H08 brief is explicit — a
 *      participant cannot un-complete.
 *   4. **Status badge tone** — `--peer-ok` for "in progress",
 *      `--ink-mute` for completed, `--warn-soft` for countdown.
 *      NEVER `--danger` (rule 2).
 *   5. **Participant rail surfaces presence in pills**, never as
 *      red/green dots; pills use the same tone family as the
 *      submission-status palette in Hub Member.
 */

import { type CSSProperties, useId, useState } from "react";

import {
  GroupRitualTimeTrio,
  type PlanetaryHourRuler,
} from "../GroupRitualTimeTrio/GroupRitualTimeTrio.js";

import {
  GRC_FRAGMENT_PLACEHOLDER,
  GRC_FRAGMENTS_HEADING,
  GRC_MARK_COMPLETED,
  GRC_PARTICIPANTS_HEADING,
  GRC_PRESENCE_LABELS,
  GRC_SCRIPT_HEADING,
  GRC_STATUS_LABELS,
  type GroupRitualPresence,
  type GroupRitualStatus,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface GroupRitualParticipant {
  id: string;
  /** Single-glyph monogram for the avatar tile. */
  initial: string;
  /** Display name. */
  name: string;
  presence: GroupRitualPresence;
}

export interface GroupRitualFragment {
  id: string;
  /** Display-friendly "host:slug" short DID — the H08 brief locks
   *  the rendering as --font-mono. */
  did: string;
  /** Display-friendly post time. */
  time: string;
  /** Fragment body — short prose, single paragraph. */
  body: string;
}

export interface GroupRitualCoordinationSurfaceProps {
  /** Ritual title — rendered as the main h1. */
  ritualTitle: string;

  status: GroupRitualStatus;

  /** Time trio compact-mode values. */
  trio: {
    localPrimary: string;
    utcPrimary: string;
    planetaryRuler: PlanetaryHourRuler;
    isCurrent: boolean;
  };

  participants: readonly GroupRitualParticipant[];

  /** Tiptap-lite paragraphs of the shared script — caller passes
   *  the parsed lines as plain strings; a richer renderer can
   *  land later. */
  scriptParagraphs: readonly string[];

  /** Chronological list of fragments — most recent FIRST per the
   *  .dc.html. */
  fragments: readonly GroupRitualFragment[];

  /** When false (e.g. status='completed' or viewer already
   *  completed), the footer hides the input + the CTA. */
  canPost?: boolean;

  /** Whether the "Mark me as completed" CTA is visible. The
   *  consumer hides it once the viewer's presence is
   *  'completed' (one-way contract). Defaults to true when
   *  canPost is true. */
  canMarkCompleted?: boolean;

  onPostFragment?: (body: string) => void;
  onMarkCompleted?: () => void;

  className?: string;
  style?: CSSProperties;
}

// ─── Helpers ──────────────────────────────────────────────────────

function statusBadgeTokens(status: GroupRitualStatus): {
  border: string;
  bg: string;
  ink: string;
} {
  switch (status) {
    case "in-progress":
      return {
        border: "var(--peer-ok)",
        bg: "var(--peer-ok-soft)",
        ink: "var(--peer-ok)",
      };
    case "completed":
      return {
        border: "var(--line)",
        bg: "transparent",
        ink: "var(--ink-mute)",
      };
    case "countdown":
      return {
        border: "var(--warn-border)",
        bg: "var(--warn-soft)",
        ink: "var(--warn)",
      };
  }
}

function presenceTokens(p: GroupRitualPresence): {
  border: string;
  ink: string;
} {
  switch (p) {
    case "in-ritual":
      return { border: "var(--peer-ok)", ink: "var(--peer-ok)" };
    case "joined":
      return { border: "var(--network-line)", ink: "var(--network)" };
    case "completed":
    case "not-present":
      return { border: "var(--line)", ink: "var(--ink-mute)" };
  }
}

// ─── Styles ───────────────────────────────────────────────────────

const ROOT: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
};

const MAIN: CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "30px 20px 120px",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 11,
};

const PARTICIPANT_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
};

const FOOTER: CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  borderTop: "1px solid var(--line)",
  background: "var(--bg-2)",
  padding: "12px 20px",
};

// ─── Component ─────────────────────────────────────────────────────

export function GroupRitualCoordinationSurface({
  ritualTitle,
  status,
  trio,
  participants,
  scriptParagraphs,
  fragments,
  canPost = status === "in-progress",
  canMarkCompleted = canPost,
  onPostFragment,
  onMarkCompleted,
  className,
  style,
}: GroupRitualCoordinationSurfaceProps) {
  const titleId = useId();
  const [draft, setDraft] = useState("");
  const badgeTokens = statusBadgeTokens(status);

  function commit() {
    const v = draft.trim();
    if (!v) return;
    onPostFragment?.(v);
    setDraft("");
  }

  return (
    <article
      aria-labelledby={titleId}
      className={className}
      data-surface="group-ritual-coordination"
      data-status={status}
      style={{ ...ROOT, ...style }}
    >
      <main style={MAIN}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            data-block="status-badge"
            data-status={status}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 13px",
              border: `1px solid ${badgeTokens.border}`,
              borderRadius: "999px",
              background: badgeTokens.bg,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: badgeTokens.ink,
              marginBottom: 14,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: badgeTokens.ink,
              }}
            />
            {GRC_STATUS_LABELS[status]}
          </div>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {ritualTitle}
          </h1>
        </header>

        {/* Compact time trio */}
        <div style={{ marginBottom: 22 }}>
          <GroupRitualTimeTrio
            compact
            localPrimary={trio.localPrimary}
            localSecondary=""
            utcPrimary={trio.utcPrimary}
            utcSecondary=""
            planetaryRuler={trio.planetaryRuler}
            planetarySecondary=""
            isCurrent={trio.isCurrent}
          />
        </div>

        {/* Participant rail */}
        <section
          data-block="participants"
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            background: "var(--bg-2)",
            padding: "14px 16px",
            marginBottom: 22,
          }}
        >
          <div style={EYEBROW}>{GRC_PARTICIPANTS_HEADING}</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 9 }}
          >
            {participants.map((p) => {
              const tokens = presenceTokens(p.presence);
              return (
                <div
                  key={p.id}
                  data-participant-id={p.id}
                  data-presence={p.presence}
                  style={PARTICIPANT_ROW}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "var(--network-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      color: "var(--network)",
                    }}
                  >
                    {p.initial}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink)",
                    }}
                    data-field="name"
                  >
                    {p.name}
                  </span>
                  <span
                    data-pill="presence"
                    style={{
                      padding: "2px 9px",
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "999px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: tokens.ink,
                    }}
                  >
                    {GRC_PRESENCE_LABELS[p.presence]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shared script (read-only) */}
        <section data-block="script" style={{ marginBottom: 24 }}>
          <div style={EYEBROW}>{GRC_SCRIPT_HEADING}</div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--ink)",
            }}
          >
            {scriptParagraphs.map((p, idx) => (
              <p
                key={idx}
                data-script-line={idx}
                style={{ margin: idx === scriptParagraphs.length - 1 ? 0 : "0 0 14px" }}
              >
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Fragment stream */}
        <section data-block="fragments">
          <div style={EYEBROW}>{GRC_FRAGMENTS_HEADING}</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {fragments.map((f) => (
              <div
                key={f.id}
                data-fragment-id={f.id}
                style={{
                  borderLeft: "2px solid var(--network-line)",
                  padding: "3px 0 3px 13px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                    }}
                    data-field="did"
                  >
                    {f.did}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                    }}
                    data-field="time"
                  >
                    {f.time}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                  data-field="body"
                >
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Sticky footer — input + "Mark me as completed" */}
      {canPost ? (
        <footer style={FOOTER} data-block="footer">
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              placeholder={GRC_FRAGMENT_PLACEHOLDER}
              data-field="fragment-input"
              aria-label={GRC_FRAGMENT_PLACEHOLDER}
              style={{
                flex: 1,
                padding: "11px 14px",
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                color: "var(--ink)",
                fontFamily: "var(--font-serif)",
                fontSize: 15,
              }}
            />
            {canMarkCompleted ? (
              <button
                type="button"
                onClick={onMarkCompleted}
                data-action="mark-completed"
                style={{
                  padding: "11px 16px",
                  borderRadius: "var(--r-md)",
                  background: "var(--network-soft)",
                  border: "1px solid var(--network-line)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {GRC_MARK_COMPLETED}
              </button>
            ) : null}
          </div>
        </footer>
      ) : null}
    </article>
  );
}
