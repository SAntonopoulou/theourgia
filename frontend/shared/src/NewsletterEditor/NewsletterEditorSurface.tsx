/**
 * NewsletterEditorSurface — H07 §S3 surface 11.
 *
 * The twin of Publication Editor: same B97 Tiptap editor in the
 * centre, but with a different right rail (subject · preview text
 * · recipients · send mode · reply-to) and a committed-make
 * confirm modal on Send now (rule §S2.3).
 *
 * Honesty rules (H07):
 *   • Subject line carries a quiet 60-char preview warning
 *     (--ink-mute label, never --warn — just observational).
 *   • Send-now confirm modal is `--warn-soft` styled (consequential
 *     but NOT destructive) — NEVER `--danger`.
 *   • Composes the B97 TiptapEditor — does NOT re-implement.
 *   • Recipients: All subscribers · A specific tier · A test list
 *     · radios with quiet count badges.
 *   • Send modes: Draft · Schedule · Send now. "Send now" opens
 *     the confirm modal; the other two save the draft / schedule.
 */

import {
  type CSSProperties,
  useCallback,
  useRef,
  useState,
} from "react";

import { useEscapeToClose } from "../hooks/useEscapeToClose.js";
import { useFocusTrap } from "../hooks/useFocusTrap.js";
import { TiptapEditor } from "../Editor/TiptapEditor.js";
import { type BookRecord, type EntityRecord } from "../api/types.js";

// ── Types ──────────────────────────────────────────────────────────

export type NewsletterRecipientKind =
  | "all"
  | "tier"
  | "test";

export type NewsletterSendMode = "draft" | "schedule" | "send-now";

export interface NewsletterRecord {
  id: string;
  headline: string;
  /** Email subject — capped at 60 chars for preview-friendliness. */
  subject: string;
  /** Email preview text (the snippet after the subject in most clients). */
  preview_text: string;
  /** Tiptap JSON doc. */
  body: unknown;
  recipient_kind: NewsletterRecipientKind;
  /** When recipient_kind = "tier", the tier id to target. */
  recipient_tier_id?: string | null;
  send_mode: NewsletterSendMode;
  scheduled_at?: string | null;
  reply_to: string;
}

export interface NewsletterRecipientOption {
  kind: NewsletterRecipientKind;
  label: string;
  /** Display count (may be "—" for tier-not-yet-picked). */
  count_label: string;
  /** Selected tier id (only relevant when kind === "tier"). */
  tier_id?: string;
}

export interface NewsletterEditorSurfaceProps {
  newsletter: NewsletterRecord;
  /** Subscriber-count breakdown for the recipient radios. */
  recipients: readonly NewsletterRecipientOption[];
  /** Currently estimated recipient count for the confirm modal. */
  recipient_count: number;
  onHeadlineChange?: (v: string) => void;
  onSubjectChange?: (v: string) => void;
  onPreviewTextChange?: (v: string) => void;
  onBodyChange?: (doc: unknown) => void;
  onRecipientChange?: (kind: NewsletterRecipientKind) => void;
  onSendModeChange?: (mode: NewsletterSendMode) => void;
  onReplyToChange?: (v: string) => void;
  /** Fired on the "Test-send to me" CTA. */
  onTestSend?: () => void;
  /** Fired when the practitioner CONFIRMS the send-now modal —
   *  not on the trigger click. */
  onConfirmSend?: () => void;
  /** Entities + books wired into the Tiptap editor's pickers. */
  entities?: readonly EntityRecord[];
  books?: readonly BookRecord[];
  className?: string;
  style?: CSSProperties;
}

// ── Styles ─────────────────────────────────────────────────────────

const PANES: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  minHeight: 0,
  overflow: "hidden",
};

const MAIN_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "30px 26px 60px",
};

const RAIL_STYLE: CSSProperties = {
  flex: "0 0 300px",
  borderLeftWidth: 1,
  borderLeftStyle: "solid",
  borderLeftColor: "var(--line)",
  background: "var(--bg-2)",
  padding: "18px 18px 30px",
  overflowY: "auto",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 7,
};

const INPUT_BASE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 14.5,
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

const SCRIM: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const SCRIM_BG: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.55)",
};

// ── Surface ────────────────────────────────────────────────────────

export function NewsletterEditorSurface({
  newsletter,
  recipients,
  recipient_count,
  onHeadlineChange,
  onSubjectChange,
  onPreviewTextChange,
  onBodyChange,
  onRecipientChange,
  onSendModeChange,
  onReplyToChange,
  onTestSend,
  onConfirmSend,
  entities,
  books,
  className,
  style,
}: NewsletterEditorSurfaceProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmPanelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes the confirm-send modal (b108-2fz a11y sweep).
  const closeConfirm = useCallback(() => setConfirmOpen(false), []);
  useEscapeToClose(confirmOpen, closeConfirm);
  useFocusTrap(confirmPanelRef, confirmOpen);

  const handleSendModeClick = useCallback(
    (mode: NewsletterSendMode) => {
      onSendModeChange?.(mode);
      if (mode === "send-now") setConfirmOpen(true);
    },
    [onSendModeChange],
  );

  return (
    <div
      data-component="newsletter-editor-surface"
      className={className}
      style={{
        display: "grid",
        gridTemplateRows: "1fr",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <div style={PANES}>
        {/* Editor centre */}
        <div className="scroll" style={MAIN_STYLE}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <input
              type="text"
              value={newsletter.headline}
              onChange={(e) => onHeadlineChange?.(e.target.value)}
              placeholder="Headline"
              aria-label="Newsletter headline"
              data-headline
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-display)",
                fontSize: 30,
                lineHeight: 1.15,
                marginBottom: 20,
                outline: "none",
              }}
            />
            <div data-newsletter-body>
              <TiptapEditor
                initialDoc={newsletter.body}
                onChange={onBodyChange}
                placeholder="Write to your readers. Press / for blocks."
                entities={entities}
                books={books}
              />
            </div>
          </div>
        </div>

        {/* Metadata rail */}
        <aside
          className="scroll"
          aria-label="Newsletter metadata"
          style={RAIL_STYLE}
        >
          {/* Subject */}
          <label htmlFor="ne-subject" style={EYEBROW}>
            Subject line
          </label>
          <input
            id="ne-subject"
            type="text"
            value={newsletter.subject}
            onChange={(e) => onSubjectChange?.(e.target.value)}
            maxLength={120}
            data-subject
            style={INPUT_BASE}
          />
          <div
            data-subject-count
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              color: "var(--ink-mute)",
              textAlign: "right",
              marginBottom: 16,
            }}
          >
            {newsletter.subject.length} / 60
            {newsletter.subject.length <= 60
              ? " · good for previews"
              : " · longer than most clients show in previews"}
          </div>

          {/* Preview text */}
          <label htmlFor="ne-preview" style={EYEBROW}>
            Preview text
          </label>
          <input
            id="ne-preview"
            type="text"
            value={newsletter.preview_text}
            onChange={(e) => onPreviewTextChange?.(e.target.value)}
            maxLength={140}
            data-preview-text
            style={{
              ...INPUT_BASE,
              marginBottom: 18,
              fontSize: 14,
            }}
          />

          {/* Recipients */}
          <div style={EYEBROW}>Recipients</div>
          <div
            data-recipients
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 18,
            }}
          >
            {recipients.map((r) => {
              const on = newsletter.recipient_kind === r.kind;
              return (
                <label
                  key={r.kind}
                  data-recipient={r.kind}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <span
                    onClick={() => onRecipientChange?.(r.kind)}
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
                    name="ne-recipient"
                    value={r.kind}
                    checked={on}
                    onChange={() => onRecipientChange?.(r.kind)}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                    }}
                  >
                    {r.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {r.count_label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Send mode */}
          <div style={EYEBROW}>Send</div>
          <div
            data-send-modes
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(
              [
                { kind: "draft", label: "Draft" },
                { kind: "schedule", label: "Schedule" },
                { kind: "send-now", label: "Send now" },
              ] as const
            ).map((m) => {
              const on = newsletter.send_mode === m.kind;
              return (
                <label
                  key={m.kind}
                  data-send-mode={m.kind}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                  }}
                >
                  <span
                    data-send-radio={m.kind}
                    onClick={() => handleSendModeClick(m.kind)}
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
                    name="ne-send-mode"
                    value={m.kind}
                    checked={on}
                    onChange={() => handleSendModeClick(m.kind)}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 13.5,
                      color: "var(--ink)",
                    }}
                  >
                    {m.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Test send */}
          <button
            type="button"
            onClick={onTestSend}
            data-action="test-send"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "9px 11px",
              marginBottom: 18,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-soft)",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            Test-send to me
          </button>

          {/* Reply-to */}
          <label htmlFor="ne-reply-to" style={EYEBROW}>
            Reply-to
          </label>
          <input
            id="ne-reply-to"
            type="text"
            value={newsletter.reply_to}
            onChange={(e) => onReplyToChange?.(e.target.value)}
            data-reply-to
            style={{
              ...INPUT_BASE,
              color: "var(--ink-soft)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
            }}
          />
        </aside>
      </div>

      {/* Confirm modal */}
      {confirmOpen ? (
        <div
          ref={confirmPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm send"
          data-confirm-modal
          style={SCRIM}
        >
          <div
            onClick={() => setConfirmOpen(false)}
            style={SCRIM_BG}
            aria-hidden="true"
          />
          <div
            style={{
              position: "relative",
              width: "min(440px, 100%)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--warn-border)",
              borderRadius: "var(--r-lg)",
              background: "var(--bg)",
              boxShadow: "0 24px 60px rgba(0,0,0,.5)",
              overflow: "hidden",
            }}
          >
            <div
              data-confirm-header
              style={{
                background: "var(--warn-soft)",
                padding: "18px 24px",
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--warn-border)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 21,
                  margin: 0,
                  color: "var(--ink)",
                }}
              >
                Send to {recipient_count.toLocaleString()} subscribers?
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-soft)",
                  margin: "6px 0 0",
                }}
              >
                Once sent, a newsletter cannot be recalled.
              </p>
            </div>
            <div style={{ padding: "18px 24px" }}>
              <div
                data-confirm-preview
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    color: "var(--ink)",
                    marginBottom: 6,
                  }}
                >
                  {newsletter.subject}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 13.5,
                    color: "var(--ink-soft)",
                    lineHeight: 1.5,
                  }}
                >
                  {newsletter.preview_text}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  data-action="cancel-send"
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: "var(--r-md)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--line-2)",
                    background: "transparent",
                    fontFamily: "var(--font-ui)",
                    fontSize: 14,
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                  }}
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    onConfirmSend?.();
                  }}
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
                  Send to {recipient_count.toLocaleString()} subscribers
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
