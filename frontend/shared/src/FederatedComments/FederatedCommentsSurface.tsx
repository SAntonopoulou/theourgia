/**
 * FederatedCommentsSurface — H08 §S3 Cluster B surface 20.
 *
 * Faithful port of ``Theourgia Federated Comments Stream.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **Federated replies mark their source** (H08 rule 24). A
 *     federated comment renders the handle in `--font-mono`
 *     `--remote` AND the `‡ from {instance}` chip. The brief
 *     is explicit: "A federated reply carries its origin
 *     openly; otherwise the two are treated the same."
 *
 *   * **Layout is identical to local replies** — federation
 *     never gets ghosted into a "special quote box." The
 *     difference is the origin disclosure, not the chrome of
 *     the reply itself.
 *
 *   * **Three sections** — Approved (default open) · Pending
 *     moderation (owner-only) · Hidden (owner-only). The
 *     owner-only sections wear an "Only you can see this" badge
 *     so the owner knows their moderation state is private.
 *
 *   * **Hide/Unhide flips with section.** A comment in the
 *     Hidden section shows "Unhide"; everywhere else "Hide". The
 *     verb names the resulting state.
 *
 *   * **No engagement metrics anywhere.** No likes, no reposts,
 *     no engagement counts. The only metric is the per-section
 *     count.
 *
 *   * **Flag fires --warn on hover** but is plain ink at rest.
 *     Flagging is a normal moderation choice, not a panic
 *     button — it's hidden inside Hidden because flagging an
 *     already-hidden comment serves no purpose.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import {
  FC_COMPONENT_KICKER,
  FC_EMPTY_APPROVED,
  FC_EMPTY_HIDDEN,
  FC_EMPTY_PENDING,
  FC_FLAG,
  FC_FROM_GLYPH,
  FC_FROM_PREFIX,
  FC_HIDE,
  FC_INTRO,
  FC_OWNER_ONLY,
  FC_REPLY,
  FC_SECTION_APPROVED,
  FC_SECTION_HIDDEN,
  FC_SECTION_PENDING,
  FC_UNHIDE,
  type FcSectionKey,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface FedCommentRow {
  id: string;
  /** Display name. */
  name: string;
  /** Initial monogram for avatar. */
  initial: string;
  /** True for federated comments. Drives chip + handle render. */
  federated: boolean;
  /** WebFinger handle — required when federated. */
  handle?: string;
  /** Instance host — required when federated. */
  instance?: string;
  /** Display-friendly timestamp. */
  ts: string;
  /** Body text. */
  body: string;
}

export interface FederatedCommentsSurfaceProps {
  /** Title of the publication this stream belongs to. */
  publicationTitle: string;
  approved: readonly FedCommentRow[];
  pending: readonly FedCommentRow[];
  hidden: readonly FedCommentRow[];
  /** Per-section initial open state. Defaults to
   *  approved=open, others=closed. */
  initialOpen?: Partial<Record<FcSectionKey, boolean>>;
  onReply?: (commentId: string) => void;
  onHide?: (commentId: string) => void;
  onUnhide?: (commentId: string) => void;
  onFlag?: (commentId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function FederatedCommentsSurface({
  publicationTitle,
  approved,
  pending,
  hidden,
  initialOpen,
  onReply,
  onHide,
  onUnhide,
  onFlag,
  className,
  style,
}: FederatedCommentsSurfaceProps): ReactNode {
  const titleId = useId();
  const [openMap, setOpenMap] = useState<
    Record<FcSectionKey, boolean>
  >({
    approved: initialOpen?.approved ?? true,
    pending: initialOpen?.pending ?? false,
    hidden: initialOpen?.hidden ?? false,
  });

  const toggle = (key: FcSectionKey) =>
    setOpenMap((p) => ({ ...p, [key]: !p[key] }));

  const sections: ReadonlyArray<{
    key: FcSectionKey;
    label: string;
    comments: readonly FedCommentRow[];
    ownerOnly: boolean;
    emptyText: string;
  }> = [
    {
      key: "approved",
      label: FC_SECTION_APPROVED,
      comments: approved,
      ownerOnly: false,
      emptyText: FC_EMPTY_APPROVED,
    },
    {
      key: "pending",
      label: FC_SECTION_PENDING,
      comments: pending,
      ownerOnly: true,
      emptyText: FC_EMPTY_PENDING,
    },
    {
      key: "hidden",
      label: FC_SECTION_HIDDEN,
      comments: hidden,
      ownerOnly: true,
      emptyText: FC_EMPTY_HIDDEN,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="federated-comments"
      style={{
        maxWidth: 660,
        margin: "0 auto",
        padding: "34px 24px 80px",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 7,
        }}
      >
        {FC_COMPONENT_KICKER}
      </div>
      <h1
        id={titleId}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 30,
          margin: 0,
          lineHeight: 1.12,
        }}
        data-field="publication-title"
      >
        Comments on “{publicationTitle}”
      </h1>
      <p
        data-field="intro"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14.5,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
          margin: "12px 0 26px",
        }}
      >
        {FC_INTRO}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((s) => (
          <SectionPanel
            key={s.key}
            sectionKey={s.key}
            label={s.label}
            comments={s.comments}
            ownerOnly={s.ownerOnly}
            emptyText={s.emptyText}
            open={openMap[s.key]}
            onToggle={() => toggle(s.key)}
            onReply={onReply}
            onHide={onHide}
            onUnhide={onUnhide}
            onFlag={onFlag}
          />
        ))}
      </div>
    </section>
  );
}

// ─── SectionPanel ────────────────────────────────────────────────

function SectionPanel({
  sectionKey,
  label,
  comments,
  ownerOnly,
  emptyText,
  open,
  onToggle,
  onReply,
  onHide,
  onUnhide,
  onFlag,
}: {
  sectionKey: FcSectionKey;
  label: string;
  comments: readonly FedCommentRow[];
  ownerOnly: boolean;
  emptyText: string;
  open: boolean;
  onToggle: () => void;
  onReply?: (id: string) => void;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
  onFlag?: (id: string) => void;
}) {
  return (
    <section
      data-section={sectionKey}
      data-owner-only={ownerOnly}
      data-open={open}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-action="toggle-section"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          width: "100%",
          padding: "14px 16px",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--ink)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--ink-mute)",
            flex: "none",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .18s ease",
          }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span
          data-field="section-label"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            color: "var(--ink)",
          }}
        >
          {label}
        </span>
        <span
          data-field="section-count"
          style={{
            padding: "1px 9px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: 20,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          {comments.length}
        </span>
        {ownerOnly ? (
          <span
            data-field="owner-only-badge"
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {FC_OWNER_ONLY}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          style={{
            padding: "4px 16px 16px",
            borderTop: "1px solid var(--line)",
          }}
        >
          {comments.length === 0 ? (
            <div
              data-field="section-empty"
              style={{
                padding: "22px 4px",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-mute)",
                textAlign: "center",
              }}
            >
              {emptyText}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                marginTop: 12,
              }}
            >
              {comments.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  inHiddenSection={sectionKey === "hidden"}
                  onReply={onReply}
                  onHide={onHide}
                  onUnhide={onUnhide}
                  onFlag={onFlag}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

// ─── CommentRow ──────────────────────────────────────────────────

function CommentRow({
  comment,
  inHiddenSection,
  onReply,
  onHide,
  onUnhide,
  onFlag,
}: {
  comment: FedCommentRow;
  inHiddenSection: boolean;
  onReply?: (id: string) => void;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
  onFlag?: (id: string) => void;
}) {
  const tone = comment.federated ? "var(--remote)" : "var(--network)";

  return (
    <div
      data-comment-id={comment.id}
      data-federated={comment.federated}
      style={{
        display: "flex",
        gap: 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontSize: 17,
          color: tone,
          background: `color-mix(in srgb, ${tone} 16%, transparent)`,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: `color-mix(in srgb, ${tone} 40%, transparent)`,
        }}
      >
        {comment.initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <span
            data-field="comment-name"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink)",
            }}
          >
            {comment.name}
          </span>
          {comment.federated && comment.handle ? (
            <>
              <span
                data-field="comment-handle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--remote)",
                }}
              >
                {comment.handle}
              </span>
              <span
                data-field="comment-from-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "1px 8px",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--remote)",
                  borderRadius: 20,
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  color: "var(--remote)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  {FC_FROM_GLYPH}
                </span>
                {FC_FROM_PREFIX}
                {comment.instance}
              </span>
            </>
          ) : null}
          <span
            data-field="comment-ts"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-mute)",
            }}
          >
            · {comment.ts}
          </span>
        </div>
        <p
          data-field="comment-body"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: "0 0 7px",
          }}
        >
          {comment.body}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <button
            type="button"
            onClick={() => onReply?.(comment.id)}
            data-action="reply"
            style={actionStyle()}
          >
            {FC_REPLY}
          </button>
          <button
            type="button"
            onClick={() =>
              inHiddenSection
                ? onUnhide?.(comment.id)
                : onHide?.(comment.id)
            }
            data-action={inHiddenSection ? "unhide" : "hide"}
            style={actionStyle()}
          >
            {inHiddenSection ? FC_UNHIDE : FC_HIDE}
          </button>
          {!inHiddenSection ? (
            <button
              type="button"
              onClick={() => onFlag?.(comment.id)}
              data-action="flag"
              style={actionStyle()}
            >
              {FC_FLAG}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function actionStyle(): CSSProperties {
  return {
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: "var(--ink-mute)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  };
}
