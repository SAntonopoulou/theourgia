/**
 * NewsletterComposerSurface — H08 §S3 Cluster A surface 7.
 *
 * Faithful port of ``Theourgia Network Newsletter Composer.dc.html``.
 * Two-pane composer: left rail of approved member submissions,
 * right pane with the editor (title + mini-toolbar + Tiptap-lite
 * body + footer disclaimer). Send now opens a confirm modal that
 * shows the recipient count + the verbatim once-sent-is-frozen
 * disclosure.
 *
 * Honesty rules wired:
 *
 *   1. **Source picker offers ONLY approved submissions** — the
 *      surface receives them already filtered. The brief is
 *      explicit (rule that hub curation must happen BEFORE
 *      embedding). The picker rail's eyebrow reads "Approved
 *      submissions" verbatim.
 *   2. **Send now CTA is `--warn-soft` chrome** — committing a
 *      newsletter to other practitioners' inboxes is a deliberate
 *      moment, never destructive. NEVER --danger (rule 2).
 *   3. **Footer disclaimer is verbatim** — "Every issue carries
 *      each recipient's own unsubscribe link, and a sent
 *      newsletter is frozen — it cannot be recalled." The double-
 *      promise is the foundation: per-recipient unsubscribe (the
 *      Phase 10 contract) + once-sent immutability (rule 22).
 *   4. **Confirm modal subtitle is verbatim**: "Once sent, a
 *      newsletter cannot be recalled."
 *   5. **No engagement-metric chrome anywhere** (rule 18) — no
 *      open rate, no click count, no "high engagement" badge.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import {
  NNC_CONFIRM_HEADER_PREFIX,
  NNC_CONFIRM_HEADER_SUFFIX,
  NNC_CONFIRM_NOT_YET,
  NNC_CONFIRM_SEND_PREFIX,
  NNC_CONFIRM_SEND_SUFFIX,
  NNC_CONFIRM_SUBTITLE,
  NNC_EMBED_LABEL,
  NNC_FOOTER_DISCLAIMER,
  NNC_INSERT_BLOCK,
  NNC_NEWSLETTER_SUFFIX,
  NNC_PREVIEW_CTA,
  NNC_SEND_NOW_CTA,
  NNC_SOURCES_HEADING,
  NNC_SOURCES_HELP,
  NNC_SUBHEADER,
  NNC_TOOLBAR_BOLD,
  NNC_TOOLBAR_HEADING,
  NNC_TOOLBAR_ITALIC,
  NNC_TOOLBAR_LINK,
  type NewsletterBodyPart,
  type NewsletterSourceKind,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface NewsletterSource {
  id: string;
  kind: NewsletterSourceKind;
  title: string;
  /** Contributor handle/slug. Rendered --font-mono. */
  byHandle: string;
}

export interface NewsletterComposerSurfaceProps {
  hubName: string;
  /** The number of recipients the issue would reach. Surfaced
   *  verbatim in the confirm modal: "Send to {n} members?". */
  recipientCount: number;
  /** The issue title — caller-controlled (parent owns state). */
  title: string;
  onTitleChange?: (next: string) => void;
  /** Approved submissions surfaced in the picker. The surface
   *  does NOT filter — pre-filter on the route. */
  sources: readonly NewsletterSource[];
  /** Body parts in caller order. */
  bodyParts: readonly NewsletterBodyPart[];
  /** Picker → embed handler. The consumer turns this into an
   *  Insert at the editor's caret. */
  onInsertSource?: (sourceId: string) => void;
  onPreview?: () => void;
  /** Fires only after the practitioner confirms in the modal. */
  onSend?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Style atoms ───────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 22px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const COLUMNS: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
  flex: "1 1 auto",
};

const RAIL: CSSProperties = {
  flex: "0 0 280px",
  borderRight: "1px solid var(--line)",
  background: "var(--bg-2)",
  padding: "16px 14px",
  overflowY: "auto",
};

const MAIN: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "26px 26px 60px",
};

const INNER: CSSProperties = {
  maxWidth: 660,
  margin: "0 auto",
};

// ─── Glyphs ────────────────────────────────────────────────────────

function GripGlyph(): ReactNode {
  return (
    <svg
      width={12}
      height={12}
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

function ToolbarIconBold(): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-serif)",
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      B
    </span>
  );
}
function ToolbarIconItalic(): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-serif)",
        fontStyle: "italic",
        fontSize: 15,
      }}
    >
      I
    </span>
  );
}
function ToolbarIconHeading(): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={{ fontFamily: "var(--font-display)", fontSize: 14 }}
    >
      H
    </span>
  );
}
function ToolbarIconLink(): ReactNode {
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
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function NewsletterComposerSurface({
  hubName,
  recipientCount,
  title,
  onTitleChange,
  sources,
  bodyParts,
  onInsertSource,
  onPreview,
  onSend,
  className,
  style,
}: NewsletterComposerSurfaceProps) {
  const titleId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="newsletter-composer"
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
              fontSize: 20,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {hubName}
            {NNC_NEWSLETTER_SUFFIX}
          </h1>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {NNC_SUBHEADER}
          </div>
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
            onClick={onPreview}
            data-action="preview"
            style={{
              padding: "8px 14px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {NNC_PREVIEW_CTA}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            data-action="open-send-confirm"
            style={{
              padding: "8px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--warn-soft)",
              border: "1px solid var(--warn-border)",
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: 12.5,
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            {NNC_SEND_NOW_CTA}
          </button>
        </div>
      </header>

      <div style={COLUMNS}>
        <aside
          className="scroll nc-src"
          style={RAIL}
          aria-label={NNC_SOURCES_HEADING}
          data-block="sources"
        >
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
              marginBottom: 10,
            }}
          >
            {NNC_SOURCES_HEADING}
          </div>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              lineHeight: 1.4,
              margin: "0 0 12px",
            }}
          >
            {NNC_SOURCES_HELP}
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onInsertSource?.(s.id)}
                data-source-id={s.id}
                data-kind={s.kind}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg)",
                  padding: "11px 13px",
                  cursor: "grab",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{ display: "flex", color: "var(--ink-mute)" }}
                  >
                    <GripGlyph />
                  </span>
                  <span
                    data-pill="kind"
                    style={{
                      padding: "1px 7px",
                      border: "1px solid var(--line-2)",
                      borderRadius: "999px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {s.kind}
                  </span>
                </div>
                <div
                  data-field="source-title"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 14,
                    color: "var(--ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {s.title}
                </div>
                <div
                  data-field="by"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-mute)",
                  }}
                >
                  {s.byHandle}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="scroll" style={MAIN}>
          <div style={INNER}>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) =>
                  onTitleChange?.(e.currentTarget.value)
                }
                aria-label="Issue title"
                data-field="title"
                style={{
                  flex: 1,
                  minWidth: 200,
                  border: "none",
                  background: "transparent",
                  color: "var(--ink)",
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  outline: "none",
                }}
              />
            </div>

            <div
              role="toolbar"
              aria-label="Editor toolbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: 6,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                marginBottom: 18,
              }}
            >
              {[
                { label: NNC_TOOLBAR_BOLD, icon: <ToolbarIconBold /> },
                {
                  label: NNC_TOOLBAR_ITALIC,
                  icon: <ToolbarIconItalic />,
                },
                {
                  label: NNC_TOOLBAR_HEADING,
                  icon: <ToolbarIconHeading />,
                },
                { label: NNC_TOOLBAR_LINK, icon: <ToolbarIconLink /> },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  aria-label={t.label}
                  data-tool={t.label.toLowerCase()}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "var(--r-sm)",
                    color: "var(--ink-mute)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t.icon}
                </button>
              ))}
              <span
                aria-hidden="true"
                style={{
                  width: 1,
                  height: 18,
                  background: "var(--line)",
                  margin: "0 6px",
                }}
              />
              <button
                type="button"
                data-action="insert-block"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 11px",
                  borderRadius: "var(--r-sm)",
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                  }}
                  aria-hidden="true"
                >
                  /
                </span>
                {NNC_INSERT_BLOCK}
              </button>
            </div>

            <div
              data-block="body"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16.5,
                lineHeight: 1.7,
                color: "var(--ink)",
              }}
            >
              {bodyParts.map((part, idx) =>
                part.kind === "paragraph" ? (
                  <p
                    key={idx}
                    style={{ margin: "0 0 16px" }}
                    data-body-part="paragraph"
                  >
                    {part.text}
                  </p>
                ) : (
                  <div
                    key={idx}
                    data-body-part="embed"
                    data-embed-kind={part.embedKind}
                    style={{
                      border: "1px solid var(--network-line)",
                      borderRadius: "var(--r-md)",
                      background: "var(--network-soft)",
                      padding: "14px 16px",
                      margin: "0 0 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        data-pill="embed"
                        style={{
                          padding: "1px 8px",
                          border: "1px solid var(--network-line)",
                          borderRadius: "999px",
                          fontFamily: "var(--font-ui)",
                          fontSize: 10.5,
                          color: "var(--network)",
                        }}
                      >
                        {NNC_EMBED_LABEL} · {part.embedKind}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10.5,
                          color: "var(--ink-mute)",
                        }}
                        data-field="did"
                      >
                        {part.did}
                      </span>
                    </div>
                    <div
                      data-field="embed-title"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        color: "var(--ink)",
                        marginBottom: 3,
                      }}
                    >
                      {part.title}
                    </div>
                    <div
                      data-field="embed-excerpt"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: 14,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {part.excerpt}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div
              data-field="footer-disclaimer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 24,
                paddingTop: 16,
                borderTop: "1px solid var(--line)",
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
              {NNC_FOOTER_DISCLAIMER}
            </div>
          </div>
        </main>
      </div>

      {confirmOpen ? (
        <ConfirmSendModal
          recipientCount={recipientCount}
          title={title}
          firstParagraph={
            (bodyParts.find((p) => p.kind === "paragraph") as
              | { kind: "paragraph"; text: string }
              | undefined)?.text ?? ""
          }
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onSend?.();
          }}
        />
      ) : null}
    </section>
  );
}

// ─── Confirm modal ─────────────────────────────────────────────────

function ConfirmSendModal({
  recipientCount,
  title,
  firstParagraph,
  onCancel,
  onConfirm,
}: {
  recipientCount: number;
  title: string;
  firstParagraph: string;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactNode {
  // Escape cancels the confirm-send modal (b108-2fz a11y sweep).
  useEscapeToClose(true, onCancel);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm send"
      data-modal="confirm-send"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={onCancel}
        data-action="scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,.55)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "min(440px, 100%)",
          border: "1px solid var(--warn-border)",
          borderRadius: "var(--r-lg)",
          background: "var(--bg)",
          boxShadow: "0 24px 60px rgba(0,0,0,.5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "var(--warn-soft)",
            padding: "18px 24px",
            borderBottom: "1px solid var(--warn-border)",
          }}
        >
          <h2
            data-field="confirm-header"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {NNC_CONFIRM_HEADER_PREFIX}
            {recipientCount}
            {NNC_CONFIRM_HEADER_SUFFIX}
          </h2>
          <p
            data-field="confirm-subtitle"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              margin: "6px 0 0",
            }}
          >
            {NNC_CONFIRM_SUBTITLE}
          </p>
        </div>
        <div style={{ padding: "18px 24px" }}>
          <div
            data-block="confirm-preview"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              padding: "13px 15px",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                color: "var(--ink)",
                marginBottom: 5,
              }}
              data-field="confirm-title"
            >
              {title}
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 13.5,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
              }}
              data-field="confirm-excerpt"
            >
              {firstParagraph}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onCancel}
              data-action="confirm-cancel"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line-2)",
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              {NNC_CONFIRM_NOT_YET}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              data-action="confirm-send"
              style={{
                flex: 1.4,
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
              {NNC_CONFIRM_SEND_PREFIX}
              {recipientCount}
              {NNC_CONFIRM_SEND_SUFFIX}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
