/**
 * RemoteContentEmbed — H08 §S3 Cluster B surface 18.
 *
 * Faithful port of ``Theourgia Remote Content Embed.dc.html``.
 *
 * This is a Tiptap-node-style primitive, NOT a route. It renders
 * a federated post embedded inside a local journal entry.
 *
 * Honesty rules wired:
 *
 *   * **Federated origin always disclosed.** The `‡ from
 *     {instance}` chip + the `@user@instance` handle appear in
 *     every state — including the unresolvable state where the
 *     post itself is gone, so authorship is never lost.
 *
 *   * **--remote chrome throughout.** The border, the chip ink,
 *     the handle text, and the "View original →" link all use
 *     `--remote` so the reader can see at a glance that the
 *     content originated off-instance.
 *
 *   * **View original → is explicit.** Clicking surfaces the
 *     remote URL — the local card never claims to be canonical.
 *
 *   * **Unresolvable preserves attribution.** Even when the
 *     origin post is gone the card keeps the author DID/handle
 *     visible so the citation survives the post's disappearance.
 */

import { type CSSProperties, type ReactNode } from "react";

import {
  RCE_FROM_GLYPH,
  RCE_FROM_PREFIX,
  RCE_UNRESOLVABLE_TITLE,
  RCE_VIEW_ORIGINAL,
  type RemoteContentEmbedState,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface RemoteContentEmbedProps {
  state: RemoteContentEmbedState;
  /** Author display name. Required for resolvable + unresolvable. */
  authorName?: string;
  /** WebFinger handle, "@user@instance.tld". Required for
   *  resolvable + unresolvable. */
  authorHandle?: string;
  /** Instance hostname (e.g. `thelema.example`). */
  instance?: string;
  /** Single-glyph monogram for the author avatar (resolvable only). */
  authorInitial?: string;
  /** Body text (resolvable only). HTML is NOT permitted — the
   *  consumer renders text or an existing element. */
  body?: ReactNode;
  /** Display-friendly local time, e.g. `27 Jun 2026 · 21:14`. */
  postedAtLabel?: string;
  /** Canonical URL of the remote post. */
  originalHref?: string;
  /** Fired when the "View original →" link is tapped. */
  onViewOriginal?: () => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Component ─────────────────────────────────────────────────────

export function RemoteContentEmbed({
  state,
  authorName,
  authorHandle,
  instance,
  authorInitial,
  body,
  postedAtLabel,
  originalHref,
  onViewOriginal,
  className,
  style,
}: RemoteContentEmbedProps): ReactNode {
  if (state === "loading") {
    return <RemoteEmbedLoading className={className} style={style} />;
  }
  if (state === "unresolvable") {
    return (
      <RemoteEmbedUnresolvable
        authorHandle={authorHandle ?? ""}
        instance={instance ?? ""}
        className={className}
        style={style}
      />
    );
  }
  return (
    <RemoteEmbedResolvable
      authorName={authorName ?? ""}
      authorHandle={authorHandle ?? ""}
      instance={instance ?? ""}
      authorInitial={authorInitial ?? ""}
      body={body}
      postedAtLabel={postedAtLabel ?? ""}
      originalHref={originalHref}
      onViewOriginal={onViewOriginal}
      className={className}
      style={style}
    />
  );
}

// ─── Resolvable ──────────────────────────────────────────────────

function RemoteEmbedResolvable({
  authorName,
  authorHandle,
  instance,
  authorInitial,
  body,
  postedAtLabel,
  originalHref,
  onViewOriginal,
  className,
  style,
}: {
  authorName: string;
  authorHandle: string;
  instance: string;
  authorInitial: string;
  body: ReactNode;
  postedAtLabel: string;
  originalHref?: string;
  onViewOriginal?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-surface="remote-content-embed"
      data-state="resolvable"
      className={className}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--remote)",
        borderRadius: "var(--r-md)",
        background: "var(--remote-soft)",
        overflow: "hidden",
        ...style,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 14px 10px",
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
            color: "var(--remote)",
            background:
              "color-mix(in srgb, var(--remote) 18%, transparent)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor:
              "color-mix(in srgb, var(--remote) 42%, transparent)",
          }}
        >
          {authorInitial}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            data-field="author-name"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink)",
            }}
          >
            {authorName}
          </div>
          <div
            data-field="author-handle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--remote)",
            }}
          >
            {authorHandle}
          </div>
        </div>
        <FromChip instance={instance} />
      </header>
      <div style={{ padding: "0 14px 14px" }}>
        <p
          data-field="body"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-soft)",
            margin: 0,
          }}
        >
          {body}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 11,
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          <span data-field="posted-at">{postedAtLabel}</span>
          <a
            href={originalHref ?? "#"}
            data-field="view-original"
            onClick={(e) => {
              if (onViewOriginal) {
                if (!originalHref) e.preventDefault();
                onViewOriginal();
              }
            }}
            target={originalHref ? "_blank" : undefined}
            rel={originalHref ? "noopener noreferrer" : undefined}
            style={{
              color: "var(--remote)",
              textDecoration: "none",
            }}
          >
            {RCE_VIEW_ORIGINAL}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Loading ─────────────────────────────────────────────────────

function RemoteEmbedLoading({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-surface="remote-content-embed"
      data-state="loading"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={className}
      style={{
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--line)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-2)",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 14px 10px",
          animation: "omShimmer 1.4s ease-in-out infinite",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            flex: "none",
            background: "var(--bg-3)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 120,
              height: 13,
              borderRadius: 5,
              background: "var(--bg-3)",
              marginBottom: 7,
            }}
          />
          <div
            style={{
              width: 180,
              height: 11,
              borderRadius: 5,
              background: "var(--bg-3)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          padding: "0 14px 16px",
          animation: "omShimmer 1.4s ease-in-out infinite",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 11,
            borderRadius: 5,
            background: "var(--bg-3)",
            marginBottom: 8,
          }}
        />
        <div
          style={{
            width: "90%",
            height: 11,
            borderRadius: 5,
            background: "var(--bg-3)",
            marginBottom: 8,
          }}
        />
        <div
          style={{
            width: "60%",
            height: 11,
            borderRadius: 5,
            background: "var(--bg-3)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Unresolvable ────────────────────────────────────────────────

function RemoteEmbedUnresolvable({
  authorHandle,
  instance,
  className,
  style,
}: {
  authorHandle: string;
  instance: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-surface="remote-content-embed"
      data-state="unresolvable"
      className={className}
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "var(--line-2)",
        borderRadius: "var(--r-md)",
        background: "var(--bg-sunk)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "14px 16px",
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
            color: "var(--ink-mute)",
            background: "var(--bg-3)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 8l8 8M16 8l-8 8" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            data-field="unresolvable-title"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-mute)",
            }}
          >
            {RCE_UNRESOLVABLE_TITLE}
          </div>
          <div
            data-field="unresolvable-citation"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--ink-mute)",
            }}
          >
            {authorHandle} · {RCE_FROM_GLYPH} {RCE_FROM_PREFIX}
            {instance}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FromChip ────────────────────────────────────────────────────

function FromChip({ instance }: { instance: string }) {
  return (
    <span
      data-field="from-chip"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: "var(--remote)",
        borderRadius: 20,
        fontFamily: "var(--font-ui)",
        fontSize: 10.5,
        color: "var(--remote)",
        flex: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          lineHeight: 1,
        }}
      >
        {RCE_FROM_GLYPH}
      </span>
      {RCE_FROM_PREFIX}
      {instance}
    </span>
  );
}
