/**
 * PublicationEditorSurface — H07 §S3 surface 5 (the worked example).
 *
 * Composes:
 *   • Topbar with breadcrumb + autosave indicator + Settings link
 *   • Chapter rail (books only; absent for essay/post/page)
 *   • B97 TiptapEditor (the editor IS the substrate — do NOT
 *     re-implement; per H07 worked-example point a)
 *   • Metadata rail: cover, summary + char count, language picker,
 *     license picker + help, tags
 *   • Footer status bar: word count · chapter count · last-saved ·
 *     publish state chip
 *
 * Honesty rules (H07):
 *   • Autosave indicator goes Saving… → Saved → invisible (no toast
 *     on every keystroke; per worked-example point b).
 *   • Sealed references in body render as the existing seal-marker
 *     pattern; this surface does not auto-decrypt them (the
 *     editor's blocks handle that; rule 5).
 *   • Cover is optional — typographic fallback is implied by the
 *     Publications index surface (cover image, when absent,
 *     surfaces a generated cover there).
 *   • License picker shows verbatim help copy per license; the
 *     practitioner picks deliberately.
 */

import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

import { TiptapEditor } from "../Editor/TiptapEditor.js";
import { type BookRecord, type EntityRecord } from "../api/types.js";

import {
  PE_ADD_CHAPTER,
  PE_BODY_PLACEHOLDER,
  PE_BREADCRUMB_HOME,
  PE_CHAPTERS_EYEBROW,
  PE_CHAPTER_TITLE_PLACEHOLDER,
  PE_COVER_AUTO_HINT,
  PE_COVER_EYEBROW,
  PE_COVER_UPLOAD,
  PE_LANGUAGE_EYEBROW,
  PE_LANGUAGE_OPTIONS,
  PE_LICENSE_EYEBROW,
  PE_LICENSE_HELP,
  PE_LICENSE_OPTIONS,
  PE_SAVE_STATE_LABELS,
  PE_SETTINGS_LABEL,
  PE_SUMMARY_EYEBROW,
  PE_SUMMARY_PLACEHOLDER,
  PE_TAGS_EYEBROW,
  PE_TAG_ADD,
  type PublicationState,
  stateChip,
} from "./copy.js";

// ── Types ──────────────────────────────────────────────────────────

export interface PublicationChapter {
  id: string;
  title: string;
  /** Tiptap JSON doc. */
  body: unknown;
  /** Approximate word count of the chapter body. */
  word_count: number;
}

export interface PublicationEditorRecord {
  id: string;
  title: string;
  kind: "book" | "essay" | "post" | "page";
  state: PublicationState;
  language: string;
  license: string;
  summary: string;
  tags: string[];
  cover_url: string | null;
  /** For books: ordered chapter list. For other kinds: single-body
   *  acts via `body` below (chapters omitted or empty). */
  chapters: PublicationChapter[];
  /** For non-book kinds (single-body): the publication's Tiptap doc. */
  body?: unknown;
}

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export interface PublicationEditorSurfaceProps {
  publication: PublicationEditorRecord;
  /** The currently-active chapter id (books only). */
  activeChapterId?: string | null;
  onActiveChapterChange?: (id: string) => void;
  /** Fired when the chapter body changes (debounce + persist in
   *  the route). */
  onChapterBodyChange?: (chapterId: string, doc: unknown) => void;
  /** Fired when single-body publications' body changes. */
  onBodyChange?: (doc: unknown) => void;
  /** Fired when the chapter title changes. */
  onChapterTitleChange?: (chapterId: string, title: string) => void;
  /** Fired on any metadata edit. */
  onMetadataChange?: (
    patch: Partial<PublicationEditorRecord>,
  ) => void;
  onAddChapter?: () => void;
  onOpenSettings?: () => void;
  onNavigateHome?: () => void;
  /** Current autosave state (route owns the debounce + the network
   *  call; this surface only renders the indicator). */
  autosaveState: AutosaveState;
  /** Last-saved time, formatted as the consumer prefers
   *  (e.g., "14:32"). */
  lastSavedLabel: string | null;
  /** Entities surfaced to the editor's EntityPicker. */
  entities?: readonly EntityRecord[];
  /** Library books surfaced to the editor's LibraryPicker. */
  books?: readonly BookRecord[];
  className?: string;
  style?: CSSProperties;
}

// ── Styles ─────────────────────────────────────────────────────────

const TOPBAR_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 22px",
  borderBottomWidth: 1,
  borderBottomStyle: "solid",
  borderBottomColor: "var(--line)",
  background: "var(--bg)",
};

const PANES_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
};

const CHAPTER_RAIL: CSSProperties = {
  flex: "0 0 240px",
  borderRightWidth: 1,
  borderRightStyle: "solid",
  borderRightColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "16px 12px",
  overflowY: "auto",
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "30px 26px 60px",
};

const META_RAIL: CSSProperties = {
  flex: "0 0 300px",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 18px 30px",
  overflowY: "auto",
};

const FOOTER_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: "9px 22px",
  borderTopWidth: 1,
  borderTopStyle: "solid",
  borderTopColor: "var(--line)",
  background: "var(--bg)",
  fontFamily: "var(--font-mono)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 8,
};

const SELECT_BASE: CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  appearance: "none",
};

// ── Icons ──────────────────────────────────────────────────────────

function SettingsIcon(): ReactElement {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={3} />
      <path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  );
}

function ChevronDown(): ReactElement {
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function PlusIcon(): ReactElement {
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

function DragHandle(): ReactElement {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 7h.01M8 12h.01M8 17h.01M15 7h.01M15 12h.01M15 17h.01" />
    </svg>
  );
}

function CoverGlyph(): ReactElement {
  return (
    <svg
      width={22}
      height={22}
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
      <circle cx={9} cy={9} r={1.4} />
    </svg>
  );
}

// ── Surface ────────────────────────────────────────────────────────

export function PublicationEditorSurface({
  publication,
  activeChapterId,
  onActiveChapterChange,
  onChapterBodyChange,
  onBodyChange,
  onChapterTitleChange,
  onMetadataChange,
  onAddChapter,
  onOpenSettings,
  onNavigateHome,
  autosaveState,
  lastSavedLabel,
  entities,
  books,
  className,
  style,
}: PublicationEditorSurfaceProps) {
  const isBook = publication.kind === "book";
  const activeId =
    activeChapterId ??
    publication.chapters[0]?.id ??
    null;

  const activeChapter = useMemo(
    () => publication.chapters.find((c) => c.id === activeId) ?? null,
    [publication.chapters, activeId],
  );

  const [tagInput, setTagInput] = useState("");

  const totalWordCount = useMemo(() => {
    if (isBook) {
      return publication.chapters.reduce(
        (acc, c) => acc + c.word_count,
        0,
      );
    }
    return publication.chapters[0]?.word_count ?? 0;
  }, [isBook, publication.chapters]);

  const handleChapterTitle = useCallback(
    (chapterId: string, title: string) => {
      onChapterTitleChange?.(chapterId, title);
    },
    [onChapterTitleChange],
  );

  const handleBodyChange = useCallback(
    (doc: unknown) => {
      if (isBook && activeChapter) {
        onChapterBodyChange?.(activeChapter.id, doc);
      } else {
        onBodyChange?.(doc);
      }
    },
    [isBook, activeChapter, onChapterBodyChange, onBodyChange],
  );

  const addTag = useCallback(() => {
    const v = tagInput.trim();
    if (v === "") return;
    if (publication.tags.includes(v)) {
      setTagInput("");
      return;
    }
    onMetadataChange?.({ tags: [...publication.tags, v] });
    setTagInput("");
  }, [tagInput, publication.tags, onMetadataChange]);

  const removeTag = useCallback(
    (t: string) => {
      onMetadataChange?.({
        tags: publication.tags.filter((x) => x !== t),
      });
    },
    [publication.tags, onMetadataChange],
  );

  const chip = stateChip(publication.state);
  const autosaveLabel = PE_SAVE_STATE_LABELS[autosaveState];

  // Choose body source: chapter body for books, publication.body for
  // single-body kinds, falling back to an empty doc.
  const editorBody =
    isBook && activeChapter
      ? activeChapter.body
      : publication.body ?? { type: "doc", content: [{ type: "paragraph" }] };

  return (
    <div
      data-component="publication-editor-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR_STYLE}>
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            data-action="breadcrumb-home"
            onClick={onNavigateHome}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--ink-mute)",
              fontFamily: "inherit",
              fontSize: "inherit",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {PE_BREADCRUMB_HOME}
          </button>
          <span style={{ color: "var(--line-2)" }} aria-hidden="true">
            /
          </span>
          <span
            style={{
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {publication.title}
          </span>
        </nav>

        <div
          data-autosave-state={autosaveState}
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginLeft: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
            minWidth: 60,
          }}
        >
          {autosaveLabel ? (
            <>
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background:
                    autosaveState === "saved"
                      ? "var(--money)"
                      : autosaveState === "saving"
                        ? "var(--info)"
                        : autosaveState === "error"
                          ? "var(--warn)"
                          : "var(--ink-mute)",
                }}
              />
              {autosaveLabel}
            </>
          ) : null}
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            data-action="open-settings"
            onClick={onOpenSettings}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            <SettingsIcon />
            {PE_SETTINGS_LABEL}
          </button>
        </div>
      </header>

      <div style={PANES_STYLE}>
        {/* Chapter rail (books only) */}
        {isBook ? (
          <aside className="scroll" aria-label="Chapters" style={CHAPTER_RAIL}>
            <div style={EYEBROW}>{PE_CHAPTERS_EYEBROW}</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {publication.chapters.map((c, i) => {
                const on = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    data-chapter-id={c.id}
                    onClick={() => onActiveChapterChange?.(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      width: "100%",
                      padding: "8px 8px",
                      borderRadius: "var(--r-sm)",
                      textAlign: "left",
                      color: on ? "var(--ink)" : "var(--ink-soft)",
                      background: on ? "var(--accent-soft)" : "transparent",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: on ? "var(--line-2)" : "transparent",
                      cursor: "pointer",
                      fontFamily: "var(--font-serif)",
                      fontSize: 13.5,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        color: "var(--ink-mute)",
                        cursor: "grab",
                      }}
                      aria-hidden="true"
                    >
                      <DragHandle />
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--ink-mute)",
                        width: 16,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.title || PE_CHAPTER_TITLE_PLACEHOLDER}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              data-action="add-chapter"
              onClick={onAddChapter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                width: "100%",
                marginTop: 10,
                padding: "9px 10px",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <PlusIcon />
              {PE_ADD_CHAPTER}
            </button>
          </aside>
        ) : null}

        {/* Editor centre */}
        <main className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {isBook && activeChapter ? (
              <>
                <input
                  type="text"
                  value={activeChapter.title}
                  onChange={(e) =>
                    handleChapterTitle(activeChapter.id, e.target.value)
                  }
                  placeholder={PE_CHAPTER_TITLE_PLACEHOLDER}
                  aria-label={PE_CHAPTER_TITLE_PLACEHOLDER}
                  data-chapter-title
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontFamily: "var(--font-display)",
                    fontSize: 34,
                    lineHeight: 1.15,
                    marginBottom: 6,
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    marginBottom: 24,
                  }}
                >
                  Chapter{" "}
                  {publication.chapters.findIndex(
                    (c) => c.id === activeChapter.id,
                  ) + 1}{" "}
                  · the editor carries all eight working-blocks
                </div>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={publication.title}
                  onChange={(e) =>
                    onMetadataChange?.({ title: e.target.value })
                  }
                  placeholder="Publication title"
                  aria-label="Publication title"
                  data-publication-title
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontFamily: "var(--font-display)",
                    fontSize: 34,
                    lineHeight: 1.15,
                    marginBottom: 24,
                    outline: "none",
                  }}
                />
              </>
            )}

            <div data-publication-body>
              <TiptapEditor
                initialDoc={editorBody}
                onChange={handleBodyChange}
                placeholder={PE_BODY_PLACEHOLDER}
                entities={entities}
                books={books}
              />
            </div>
          </div>
        </main>

        {/* Metadata rail */}
        <aside
          className="scroll"
          aria-label="Publication metadata"
          style={META_RAIL}
        >
          <div style={EYEBROW}>{PE_COVER_EYEBROW}</div>
          {publication.cover_url ? (
            <div
              style={{
                width: "100%",
                aspectRatio: "3/4",
                borderRadius: "var(--r-md)",
                background: `url(${publication.cover_url}) center/cover`,
                marginBottom: 18,
              }}
              aria-label="Cover preview"
            />
          ) : (
            <button
              type="button"
              data-action="upload-cover"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                aspectRatio: "3/4",
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "var(--bg)",
                marginBottom: 18,
                cursor: "pointer",
              }}
            >
              <CoverGlyph />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                }}
              >
                {PE_COVER_UPLOAD}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {PE_COVER_AUTO_HINT}
              </span>
            </button>
          )}

          {/* Summary */}
          <div style={EYEBROW}>{PE_SUMMARY_EYEBROW}</div>
          <textarea
            rows={3}
            maxLength={240}
            value={publication.summary}
            onChange={(e) =>
              onMetadataChange?.({ summary: e.target.value })
            }
            placeholder={PE_SUMMARY_PLACEHOLDER}
            data-publication-summary
            aria-label={PE_SUMMARY_EYEBROW}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              lineHeight: 1.5,
              resize: "vertical",
              marginBottom: 5,
            }}
          />
          <div
            data-summary-count
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
              textAlign: "right",
              marginBottom: 18,
            }}
          >
            {publication.summary.length} / 240
          </div>

          {/* Language */}
          <div style={EYEBROW}>{PE_LANGUAGE_EYEBROW}</div>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <select
              value={publication.language}
              onChange={(e) =>
                onMetadataChange?.({ language: e.target.value })
              }
              data-publication-language
              aria-label={PE_LANGUAGE_EYEBROW}
              style={SELECT_BASE}
            >
              {PE_LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--ink-mute)",
              }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </div>

          {/* License */}
          <div style={EYEBROW}>{PE_LICENSE_EYEBROW}</div>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <select
              value={publication.license}
              onChange={(e) =>
                onMetadataChange?.({ license: e.target.value })
              }
              data-publication-license
              aria-label={PE_LICENSE_EYEBROW}
              style={SELECT_BASE}
            >
              {PE_LICENSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 11,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--ink-mute)",
              }}
              aria-hidden="true"
            >
              <ChevronDown />
            </span>
          </div>
          <div
            data-license-help
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
              lineHeight: 1.45,
              marginBottom: 18,
            }}
          >
            {PE_LICENSE_HELP[publication.license] ??
              PE_LICENSE_HELP["all-rights-reserved"]}
          </div>

          {/* Tags */}
          <div style={EYEBROW}>{PE_TAGS_EYEBROW}</div>
          <div
            data-publication-tags
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {publication.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "var(--accent-soft)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink)",
                }}
              >
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
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
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
              placeholder={PE_TAG_ADD}
              aria-label="Add tag"
              data-publication-tag-input
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
        </aside>
      </div>

      {/* Footer */}
      <footer data-publication-footer style={FOOTER_STYLE}>
        <span data-word-count>
          {totalWordCount.toLocaleString()} words
        </span>
        {isBook ? (
          <span data-chapter-count>
            {publication.chapters.length} chapters
          </span>
        ) : null}
        {lastSavedLabel ? (
          <span data-last-saved>Last saved {lastSavedLabel}</span>
        ) : null}
        <span
          data-state-chip={publication.state}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-ui)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: chip.color,
            }}
          />
          {chip.label}
        </span>
      </footer>
    </div>
  );
}
