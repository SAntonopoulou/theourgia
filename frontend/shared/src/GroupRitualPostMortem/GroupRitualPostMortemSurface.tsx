/**
 * GroupRitualPostMortemSurface — H08 §S3 Cluster A surface 10.
 *
 * Faithful port of ``Theourgia Group Ritual Post-Mortem.dc.html``.
 * The frozen collective log — script + voces + correspondences
 * + fragment stream are all read-only. Each participant gets
 * ONE write-once reflection (rule 22).
 *
 * Honesty rules wired:
 *
 *   1. **Script + fragment stream are FROZEN** — rendered as
 *      read-only paragraphs / cards with --ink-soft text. The
 *      "frozen" eyebrow suffix is verbatim from the brief.
 *   2. **Each participant's reflection is WRITE-ONCE.** When the
 *      consumer passes a viewerReflection (already-written), the
 *      surface renders read-mode; absent, it renders the form.
 *      Once submitted, the parent removes the form — there is
 *      no edit affordance, ever.
 *   3. **4000-character limit** on the reflection. Counter
 *      surfaces at the bottom of the textarea; the Submit CTA
 *      is disabled when over the limit.
 *   4. **Egregore chip** renders ONLY when the ritual declared
 *      an egregore creation event. The link points at the
 *      entity in the practitioner's beings (cross-vault
 *      reference). Copy is verbatim.
 *   5. **"Closed" badge is neutral** (--ink-mute / --line-2),
 *      never celebratory. The ritual is complete; it's not a
 *      win-state.
 */

import { type CSSProperties, useId, useState } from "react";

import {
  GroupRitualTimeTrio,
  type PlanetaryHourRuler,
} from "../GroupRitualTimeTrio/GroupRitualTimeTrio.js";

import {
  GRPM_CLOSED_BADGE,
  GRPM_COMPLETED_PREFIX,
  GRPM_EGREGORE_LINK_SUFFIX,
  GRPM_EGREGORE_PREFIX,
  GRPM_FRAGMENTS_FROZEN,
  GRPM_OPEN_AS_ENTRY,
  GRPM_REFLECTION_LIMIT,
  GRPM_REFLECTION_PLACEHOLDER,
  GRPM_REFLECTION_SUBMIT,
  GRPM_REFLECTIONS_HEADING,
  GRPM_SCRIPT_FROZEN,
  GRPM_YOUR_REFLECTION,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface GroupRitualFrozenFragment {
  id: string;
  /** Display "host:slug" short DID. */
  did: string;
  /** Display time. */
  time: string;
  body: string;
}

export interface GroupRitualReflection {
  participantId: string;
  /** Single-glyph avatar tile monogram. */
  initial: string;
  name: string;
  body: string;
}

/** Egregore declaration metadata. When present, the surface
 *  renders the verbatim chip with a link to the entity. */
export interface GroupRitualEgregoreDeclaration {
  entityName: string;
  entityHref: string;
}

export interface GroupRitualPostMortemSurfaceProps {
  ritualTitle: string;
  /** Display-friendly "20 Mar 2026". */
  completedAtLabel: string;

  /** Time trio compact-mode values for the completed moment. */
  trio: {
    localPrimary: string;
    utcPrimary: string;
    planetaryRuler: PlanetaryHourRuler;
    /** Always false on a post-mortem — the planetary hour was
     *  current AT the completion moment, not the viewer's now. */
    isCurrent?: boolean;
  };

  /** When set, render the egregore chip. */
  egregore?: GroupRitualEgregoreDeclaration;

  /** The shared script — frozen. One paragraph per array entry.
   *  Post-mortem renders these in --ink-soft. */
  scriptParagraphs: readonly string[];

  /** Frozen fragments — caller order preserved. */
  fragments: readonly GroupRitualFrozenFragment[];

  /** Already-written reflections (write-once, read-mode). */
  existingReflections: readonly GroupRitualReflection[];

  /** When true, the viewer is a participant who has NOT yet
   *  written their reflection. When false (already written OR
   *  not a participant), the write form is hidden. */
  viewerCanReflect: boolean;

  onSubmitReflection?: (body: string) => void;
  onOpenAsEntry?: () => void;

  className?: string;
  style?: CSSProperties;
}

// ─── Styles ────────────────────────────────────────────────────────

const ROOT: CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
};

const MAIN: CSSProperties = {
  maxWidth: 620,
  margin: "0 auto",
  padding: "34px 22px 70px",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const FROZEN_BODY: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 16,
  lineHeight: 1.65,
  color: "var(--ink-soft)",
};

// ─── Glyphs ────────────────────────────────────────────────────────

function LockGlyph() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EntryGlyph() {
  return (
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
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 9h6" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function GroupRitualPostMortemSurface({
  ritualTitle,
  completedAtLabel,
  trio,
  egregore,
  scriptParagraphs,
  fragments,
  existingReflections,
  viewerCanReflect,
  onSubmitReflection,
  onOpenAsEntry,
  className,
  style,
}: GroupRitualPostMortemSurfaceProps) {
  const titleId = useId();
  const [draft, setDraft] = useState("");

  const charCount = draft.length;
  const overLimit = charCount > GRPM_REFLECTION_LIMIT;

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (overLimit) return;
    onSubmitReflection?.(v);
    setDraft("");
  }

  return (
    <article
      aria-labelledby={titleId}
      className={className}
      data-surface="group-ritual-post-mortem"
      style={{ ...ROOT, ...style }}
    >
      <div style={MAIN}>
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            data-block="closed-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "4px 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "999px",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              marginBottom: 14,
            }}
          >
            <LockGlyph />
            {GRPM_CLOSED_BADGE}
          </div>
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              lineHeight: 1.1,
              margin: "0 0 6px",
            }}
          >
            {ritualTitle}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
            }}
            data-field="completed-at"
          >
            {GRPM_COMPLETED_PREFIX}
            {completedAtLabel}
          </div>
        </header>

        {/* Compact time trio (pinned for the completed moment) */}
        <div style={{ marginBottom: 20 }}>
          <GroupRitualTimeTrio
            compact
            localPrimary={trio.localPrimary}
            localSecondary=""
            utcPrimary={trio.utcPrimary}
            utcSecondary=""
            planetaryRuler={trio.planetaryRuler}
            planetarySecondary=""
            isCurrent={!!trio.isCurrent}
            planetaryEyebrow="Planetary"
          />
        </div>

        {/* Egregore chip — only if declared */}
        {egregore ? (
          <div
            data-block="egregore-chip"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid var(--network-line)",
              borderRadius: "var(--r-md)",
              background: "var(--network-soft)",
              padding: "12px 15px",
              marginBottom: 24,
            }}
          >
            <span
              aria-hidden="true"
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
            >
              ‡
            </span>
            <div style={{ flex: 1 }}>
              <span
                data-field="egregore-prefix"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--ink)",
                }}
              >
                {GRPM_EGREGORE_PREFIX}
              </span>
              <a
                href={egregore.entityHref}
                data-field="egregore-link"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--network)",
                }}
              >
                {egregore.entityName}
                {GRPM_EGREGORE_LINK_SUFFIX}
              </a>
            </div>
          </div>
        ) : null}

        {/* Frozen script */}
        <section data-block="script-frozen" style={{ marginBottom: 24 }}>
          <div style={EYEBROW}>{GRPM_SCRIPT_FROZEN}</div>
          <div style={FROZEN_BODY}>
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

        {/* Frozen fragments */}
        <section data-block="fragments-frozen" style={{ marginBottom: 26 }}>
          <div style={EYEBROW}>{GRPM_FRAGMENTS_FROZEN}</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 9 }}
          >
            {fragments.map((f) => (
              <div
                key={f.id}
                data-fragment-id={f.id}
                style={{
                  borderLeft: "2px solid var(--line-2)",
                  padding: "2px 0 2px 12px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-mute)",
                    marginBottom: 2,
                  }}
                  data-field="meta"
                >
                  {f.did} · {f.time}
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.45,
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

        {/* Reflections */}
        <section
          data-block="reflections"
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: 22,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              marginBottom: 14,
            }}
          >
            {GRPM_REFLECTIONS_HEADING}
          </div>

          {/* Already-written reflections */}
          {existingReflections.map((r) => (
            <div
              key={r.participantId}
              data-reflection-participant={r.participantId}
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginBottom: 8,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--network-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    color: "var(--network)",
                  }}
                >
                  {r.initial}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink)",
                  }}
                  data-field="reflection-author"
                >
                  {r.name}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink-soft)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
                data-field="reflection-body"
              >
                {r.body}
              </p>
            </div>
          ))}

          {/* Write-once form (only when viewer can reflect) */}
          {viewerCanReflect ? (
            <div
              data-block="reflection-form"
              style={{
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                  color: "var(--ink-mute)",
                  marginBottom: 8,
                }}
              >
                {GRPM_YOUR_REFLECTION}
              </div>
              <textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                placeholder={GRPM_REFLECTION_PLACEHOLDER}
                aria-label={GRPM_YOUR_REFLECTION}
                data-field="reflection-input"
                style={{
                  width: "100%",
                  padding: "11px 13px",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  lineHeight: 1.55,
                  resize: "vertical",
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span
                  data-field="reflection-counter"
                  data-over={overLimit}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: overLimit ? "var(--warn)" : "var(--ink-mute)",
                  }}
                >
                  {charCount} / {GRPM_REFLECTION_LIMIT}
                </span>
                <button
                  type="button"
                  onClick={commit}
                  disabled={overLimit || draft.trim() === ""}
                  data-action="submit-reflection"
                  style={{
                    padding: "9px 18px",
                    borderRadius: "var(--r-md)",
                    background:
                      overLimit || draft.trim() === ""
                        ? "var(--bg-3)"
                        : "var(--accent)",
                    color:
                      overLimit || draft.trim() === ""
                        ? "var(--ink-mute)"
                        : "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor:
                      overLimit || draft.trim() === ""
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {GRPM_REFLECTION_SUBMIT}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Open as entry */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            type="button"
            onClick={onOpenAsEntry}
            data-action="open-as-entry"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              color: "var(--network)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <EntryGlyph />
            {GRPM_OPEN_AS_ENTRY}
          </button>
        </div>
      </div>
    </article>
  );
}
