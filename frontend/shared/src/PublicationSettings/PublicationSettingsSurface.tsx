/**
 * PublicationSettingsSurface — H07 §S3 surface 6.
 *
 * Single-column form (~720px) with five sections:
 * Identity · Cover & summary · Schedule · Distribution · Discoverability.
 *
 * Honesty rules (H07):
 *   • Slug carries the `‡` "URLs are stable forever" microcopy
 *     (rule 8 · committed-make extends to URL choices).
 *   • ActivityPub distribution checkbox is disabled with the
 *     "Available when Federation ships" deferral note.
 *   • Tradition tags vs free-text tags kept distinct (the H07 §S3
 *     #6 IA decision: free-text drift is the failure mode).
 *   • No `--danger` anywhere — this is a configuration form, not
 *     a destruction surface.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useState,
} from "react";

import {
  PS_ADD_AUTHOR,
  PS_ADD_TAG,
  PS_AUTHORS_LABEL,
  PS_COVER_HEADING,
  PS_COVER_LABEL,
  PS_DISCOVER_HEADING,
  PS_DIST_ACTIVITYPUB,
  PS_DIST_AP_NOTE,
  PS_DIST_CATALOG,
  PS_DIST_NEWSLETTER,
  PS_DIST_RSS,
  PS_DISTRIBUTION_HEADING,
  PS_IDENTITY_HEADING,
  PS_PICK_TRADITION,
  PS_SCHED_LATER,
  PS_SCHED_NOTE,
  PS_SCHED_NOW,
  PS_SCHEDULE_HEADING,
  PS_SLUG_LABEL,
  PS_SLUG_NOTE,
  PS_SUBTITLE,
  PS_SUMMARY_LABEL,
  PS_TAGS_LABEL,
  PS_TAGS_TAIL,
  PS_TITLE,
  PS_TITLE_LABEL,
  PS_TRADITION_LABEL,
  PS_TRADITION_OPTIONS,
  PS_TRADITION_TAIL,
  estimateReadingTime,
} from "./copy.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AuthorIdentityOption {
  id: string;
  label: string;
}

export interface PublicationSettingsRecord {
  id: string;
  title: string;
  slug: string;
  /** Optional vault-prefix shown ahead of the editable slug. */
  slug_prefix?: string;
  authors: { id: string; label: string }[];
  summary: string;
  /** When set, the form skips the cover-upload placeholder. */
  cover_url: string | null;
  schedule:
    | { mode: "now" }
    | { mode: "later"; at: string };
  distribution: {
    catalog: boolean;
    rss: boolean;
    /** ActivityPub is disabled in the UI until Phase 12 ships. */
    activity_pub: boolean;
    newsletter: boolean;
  };
  tags: string[];
  tradition_tags: string[];
  /** Word count used for the reading-time estimate (quiet stat). */
  total_word_count: number;
}

export interface PublicationSettingsSurfaceProps {
  publication: PublicationSettingsRecord;
  /** All known identities in the vault the practitioner can pick
   *  from when adding a co-author. */
  availableAuthors: readonly AuthorIdentityOption[];
  onChange?: (patch: Partial<PublicationSettingsRecord>) => void;
  className?: string;
  style?: CSSProperties;
}

// ── Styles ─────────────────────────────────────────────────────────

const FORM_WRAP: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "40px 26px 80px",
};

const SECTION: CSSProperties = {
  paddingBottom: 26,
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  marginBottom: 26,
};

const SECTION_LAST: CSSProperties = {
  paddingBottom: 0,
  marginBottom: 0,
};

const H2: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  margin: "0 0 16px",
};

const LABEL: CSSProperties = {
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
  background: "var(--bg-2)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 16,
};

const PILL_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  borderRadius: 20,
  background: "var(--accent-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink)",
};

const PILL_DASHED: CSSProperties = {
  padding: "5px 11px",
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "var(--line-2)",
  borderRadius: 20,
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  cursor: "pointer",
};

const RADIO_BASE = (on: boolean): CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: "50%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: on ? "var(--accent)" : "var(--line-2)",
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
});

const CHECKBOX_BASE = (on: boolean): CSSProperties => ({
  width: 19,
  height: 19,
  borderRadius: 5,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: on ? "var(--accent)" : "var(--line-2)",
  background: on ? "var(--accent)" : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  marginTop: 1,
});

// ── Icons ──────────────────────────────────────────────────────────

function CheckIcon(): ReactElement {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent-ink)"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

function CoverGlyph(): ReactElement {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-mute)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={4} y={4} width={16} height={16} rx={2} />
      <path d="M4 15l4-4 4 4 4-5 4 5" />
    </svg>
  );
}

function CloseIcon(): ReactElement {
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

// ── Surface ────────────────────────────────────────────────────────

export function PublicationSettingsSurface({
  publication,
  availableAuthors,
  onChange,
  className,
  style,
}: PublicationSettingsSurfaceProps) {
  const [tagInput, setTagInput] = useState("");
  const [authorPickerOpen, setAuthorPickerOpen] = useState(false);
  const [traditionPickerOpen, setTraditionPickerOpen] = useState(false);

  const patch = useCallback(
    (p: Partial<PublicationSettingsRecord>) => onChange?.(p),
    [onChange],
  );

  const handleSlugChange = useCallback(
    (raw: string) => {
      // Coerce to URL-safe characters as the practitioner types — keep
      // visual feedback honest. (Spaces → hyphens; uppercase →
      // lowercase; non-[a-z0-9-] stripped.)
      const slug = raw
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
      patch({ slug });
    },
    [patch],
  );

  const addTag = useCallback(() => {
    const v = tagInput.trim();
    if (v === "" || publication.tags.includes(v)) {
      setTagInput("");
      return;
    }
    patch({ tags: [...publication.tags, v] });
    setTagInput("");
  }, [tagInput, publication.tags, patch]);

  const removeTag = useCallback(
    (t: string) => patch({ tags: publication.tags.filter((x) => x !== t) }),
    [publication.tags, patch],
  );

  const addAuthor = useCallback(
    (id: string) => {
      if (publication.authors.some((a) => a.id === id)) return;
      const opt = availableAuthors.find((a) => a.id === id);
      if (!opt) return;
      patch({ authors: [...publication.authors, opt] });
      setAuthorPickerOpen(false);
    },
    [availableAuthors, publication.authors, patch],
  );

  const removeAuthor = useCallback(
    (id: string) =>
      patch({
        authors: publication.authors.filter((a) => a.id !== id),
      }),
    [publication.authors, patch],
  );

  const addTradition = useCallback(
    (value: string) => {
      if (publication.tradition_tags.includes(value)) return;
      patch({
        tradition_tags: [...publication.tradition_tags, value],
      });
      setTraditionPickerOpen(false);
    },
    [publication.tradition_tags, patch],
  );

  const removeTradition = useCallback(
    (value: string) =>
      patch({
        tradition_tags: publication.tradition_tags.filter((x) => x !== value),
      }),
    [publication.tradition_tags, patch],
  );

  const setSchedule = useCallback(
    (mode: "now" | "later") => {
      if (mode === "now") patch({ schedule: { mode: "now" } });
      else
        patch({
          schedule: {
            mode: "later",
            at:
              publication.schedule.mode === "later"
                ? publication.schedule.at
                : "",
          },
        });
    },
    [publication.schedule, patch],
  );

  const setScheduleAt = useCallback(
    (at: string) => patch({ schedule: { mode: "later", at } }),
    [patch],
  );

  const readingMin = estimateReadingTime(publication.total_word_count);

  return (
    <div
      data-component="publication-settings-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        overflowY: "auto",
        ...style,
      }}
    >
      <main className="scroll" style={{ overflowY: "auto" }}>
        <div style={FORM_WRAP}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              margin: "0 0 4px",
            }}
          >
            {PS_TITLE}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
              margin: "0 0 30px",
            }}
          >
            {PS_SUBTITLE}
          </p>

          {/* Identity */}
          <section data-section="identity" style={SECTION}>
            <h2 style={H2}>{PS_IDENTITY_HEADING}</h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label htmlFor="ps-title" style={LABEL}>
                  {PS_TITLE_LABEL}
                </label>
                <input
                  id="ps-title"
                  type="text"
                  value={publication.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  data-ps-title
                  style={INPUT_BASE}
                />
              </div>
              <div>
                <label htmlFor="ps-slug" style={LABEL}>
                  {PS_SLUG_LABEL}
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    overflow: "hidden",
                  }}
                >
                  {publication.slug_prefix ? (
                    <span
                      style={{
                        padding: "10px 0 10px 13px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--ink-mute)",
                      }}
                    >
                      {publication.slug_prefix}
                    </span>
                  ) : null}
                  <input
                    id="ps-slug"
                    type="text"
                    value={publication.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    data-ps-slug
                    style={{
                      flex: 1,
                      padding: "10px 13px",
                      border: "none",
                      background: "transparent",
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <div
                  data-ps-slug-note
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                    marginTop: 7,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: "var(--font-glyph)",
                      color: "var(--accent)",
                      flex: "none",
                    }}
                  >
                    ‡
                  </span>
                  {PS_SLUG_NOTE}
                </div>
              </div>
              <div>
                <label style={LABEL}>{PS_AUTHORS_LABEL}</label>
                <div
                  data-ps-authors
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    position: "relative",
                  }}
                >
                  {publication.authors.map((a) => (
                    <span key={a.id} style={PILL_BASE}>
                      {a.label}
                      <button
                        type="button"
                        aria-label={`Remove ${a.label}`}
                        onClick={() => removeAuthor(a.id)}
                        style={{
                          display: "flex",
                          border: "none",
                          background: "transparent",
                          color: "var(--ink-mute)",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    data-ps-add-author
                    onClick={() => setAuthorPickerOpen((v) => !v)}
                    style={PILL_DASHED}
                  >
                    {PS_ADD_AUTHOR}
                  </button>
                  {authorPickerOpen ? (
                    <div
                      role="menu"
                      data-author-picker
                      style={{
                        position: "absolute",
                        top: 32,
                        left: 0,
                        zIndex: 10,
                        minWidth: 200,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        boxShadow: "0 14px 34px rgba(0,0,0,.45)",
                        padding: 6,
                      }}
                    >
                      {availableAuthors
                        .filter(
                          (a) =>
                            !publication.authors.some((p) => p.id === a.id),
                        )
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            role="menuitem"
                            data-author-id={a.id}
                            onClick={() => addAuthor(a.id)}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 11px",
                              borderRadius: "var(--r-sm)",
                              fontFamily: "var(--font-ui)",
                              fontSize: 13,
                              color: "var(--ink)",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            {a.label}
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Cover & summary */}
          <section data-section="cover" style={SECTION}>
            <h2 style={H2}>{PS_COVER_HEADING}</h2>
            <div
              style={{
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                data-ps-cover
                aria-label={PS_COVER_LABEL}
                style={{
                  flex: "0 0 120px",
                  aspectRatio: "3/4",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "var(--line-2)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  cursor: "pointer",
                }}
              >
                {publication.cover_url ? (
                  <img
                    src={publication.cover_url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "var(--r-md)",
                    }}
                  />
                ) : (
                  <>
                    <CoverGlyph />
                    <span
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {PS_COVER_LABEL}
                    </span>
                  </>
                )}
              </button>
              <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                <label htmlFor="ps-summary" style={LABEL}>
                  {PS_SUMMARY_LABEL}
                </label>
                <textarea
                  id="ps-summary"
                  rows={3}
                  maxLength={240}
                  value={publication.summary}
                  onChange={(e) => patch({ summary: e.target.value })}
                  data-ps-summary
                  style={{
                    ...INPUT_BASE,
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    resize: "vertical",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10.5,
                    color: "var(--ink-mute)",
                  }}
                >
                  <span data-ps-summary-count>
                    {publication.summary.length} / 240
                  </span>
                  <span data-ps-reading-time>~ {readingMin} min read</span>
                </div>
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section data-section="schedule" style={SECTION}>
            <h2 style={H2}>{PS_SCHEDULE_HEADING}</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {(["now", "later"] as const).map((mode) => {
                const on = publication.schedule.mode === mode;
                return (
                  <label
                    key={mode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      data-schedule-mode={mode}
                      data-on={on}
                      onClick={() => setSchedule(mode)}
                      style={RADIO_BASE(on)}
                    >
                      {on ? (
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--accent-ink)",
                          }}
                        />
                      ) : null}
                    </span>
                    <input
                      type="radio"
                      name="ps-schedule"
                      value={mode}
                      checked={on}
                      onChange={() => setSchedule(mode)}
                      style={{ display: "none" }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 15,
                        color: "var(--ink)",
                      }}
                    >
                      {mode === "now" ? PS_SCHED_NOW : PS_SCHED_LATER}
                    </span>
                  </label>
                );
              })}
              {publication.schedule.mode === "later" ? (
                <>
                  <div style={{ marginLeft: 27 }}>
                    <input
                      type="datetime-local"
                      value={publication.schedule.at}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      data-ps-schedule-at
                      aria-label="Scheduled date and time"
                      style={{
                        padding: "9px 12px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--line-2)",
                        borderRadius: "var(--r-md)",
                        background: "var(--bg-2)",
                        color: "var(--ink-soft)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13.5,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: "var(--ink-mute)",
                      marginLeft: 27,
                    }}
                  >
                    {PS_SCHED_NOTE}
                  </div>
                </>
              ) : null}
            </div>
          </section>

          {/* Distribution */}
          <section data-section="distribution" style={SECTION}>
            <h2 style={H2}>{PS_DISTRIBUTION_HEADING}</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              {(
                [
                  {
                    key: "catalog",
                    label: PS_DIST_CATALOG,
                    on: publication.distribution.catalog,
                    note: "",
                    disabled: false,
                  },
                  {
                    key: "rss",
                    label: PS_DIST_RSS,
                    on: publication.distribution.rss,
                    note: "",
                    disabled: false,
                  },
                  {
                    key: "activity_pub",
                    label: PS_DIST_ACTIVITYPUB,
                    on: publication.distribution.activity_pub,
                    note: PS_DIST_AP_NOTE,
                    disabled: true,
                  },
                  {
                    key: "newsletter",
                    label: PS_DIST_NEWSLETTER,
                    on: publication.distribution.newsletter,
                    note: "",
                    disabled: false,
                  },
                ] as const
              ).map((row) => {
                const onClick = () => {
                  if (row.disabled) return;
                  patch({
                    distribution: {
                      ...publication.distribution,
                      [row.key]: !row.on,
                    },
                  });
                };
                return (
                  <label
                    key={row.key}
                    data-distribution={row.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      cursor: row.disabled ? "not-allowed" : "pointer",
                      opacity: row.disabled ? 0.5 : 1,
                    }}
                  >
                    <span
                      data-checkbox={row.key}
                      onClick={onClick}
                      style={CHECKBOX_BASE(row.on)}
                    >
                      {row.on ? <CheckIcon /> : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={row.on}
                      disabled={row.disabled}
                      onChange={onClick}
                      style={{ display: "none" }}
                    />
                    <span>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: 14,
                          color: "var(--ink)",
                        }}
                      >
                        {row.label}
                      </span>
                      {row.note ? (
                        <>
                          <br />
                          <span
                            style={{
                              fontFamily: "var(--font-ui)",
                              fontSize: 11.5,
                              color: "var(--ink-mute)",
                            }}
                          >
                            {row.note}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Discoverability */}
          <section data-section="discoverability" style={SECTION_LAST}>
            <h2 style={H2}>{PS_DISCOVER_HEADING}</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>
                {PS_TAGS_LABEL}{" "}
                <span style={{ textTransform: "none", letterSpacing: 0 }}>
                  {PS_TAGS_TAIL}
                </span>
              </label>
              <div
                data-ps-tags
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {publication.tags.map((t) => (
                  <span key={t} style={PILL_BASE}>
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t}`}
                      onClick={() => removeTag(t)}
                      style={{
                        display: "flex",
                        border: "none",
                        background: "transparent",
                        color: "var(--ink-mute)",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <CloseIcon />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onBlur={addTag}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder={PS_ADD_TAG}
                  aria-label="Add tag"
                  data-ps-tag-input
                  style={{
                    padding: "4px 11px",
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "var(--line-2)",
                    borderRadius: 20,
                    background: "transparent",
                    color: "var(--ink-mute)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    outline: "none",
                    minWidth: 70,
                  }}
                />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <label style={LABEL}>
                {PS_TRADITION_LABEL}{" "}
                <span style={{ textTransform: "none", letterSpacing: 0 }}>
                  {PS_TRADITION_TAIL}
                </span>
              </label>
              <div
                data-ps-traditions
                style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
              >
                {publication.tradition_tags.map((t) => {
                  const opt = PS_TRADITION_OPTIONS.find(
                    (o) => o.value === t,
                  );
                  return (
                    <span
                      key={t}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 11px",
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: "var(--info-soft)",
                        borderRadius: 20,
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        color: "var(--info)",
                      }}
                    >
                      {opt ? (
                        <>
                          <span style={{ fontFamily: "var(--font-glyph)" }}>
                            {opt.glyph}
                          </span>
                          {opt.label}
                        </>
                      ) : (
                        t
                      )}
                      <button
                        type="button"
                        aria-label={`Remove tradition ${t}`}
                        onClick={() => removeTradition(t)}
                        style={{
                          display: "flex",
                          border: "none",
                          background: "transparent",
                          color: "var(--info)",
                          padding: 0,
                          cursor: "pointer",
                          marginLeft: 4,
                        }}
                      >
                        <CloseIcon />
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  data-ps-add-tradition
                  onClick={() => setTraditionPickerOpen((v) => !v)}
                  style={PILL_DASHED}
                >
                  {PS_PICK_TRADITION}
                </button>
              </div>
              {traditionPickerOpen ? (
                <div
                  role="menu"
                  data-tradition-picker
                  style={{
                    position: "absolute",
                    top: 60,
                    right: 0,
                    zIndex: 10,
                    maxHeight: 240,
                    overflowY: "auto",
                    width: 240,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    borderRadius: "var(--r-md)",
                    background: "var(--bg-2)",
                    boxShadow: "0 14px 34px rgba(0,0,0,.45)",
                    padding: 6,
                  }}
                >
                  {PS_TRADITION_OPTIONS.filter(
                    (o) => !publication.tradition_tags.includes(o.value),
                  ).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      role="menuitem"
                      data-tradition={o.value}
                      onClick={() => addTradition(o.value)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        width: "100%",
                        padding: "8px 11px",
                        borderRadius: "var(--r-sm)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 13,
                        color: "var(--ink)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          fontFamily: "var(--font-glyph)",
                          color: "var(--info)",
                        }}
                      >
                        {o.glyph}
                      </span>
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
