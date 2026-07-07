/**
 * FollowersPaneSurface — H08 §S3 Cluster B surface 17.
 *
 * Faithful port of ``Theourgia Followers Pane.dc.html``.
 *
 * Honesty rules wired:
 *
 *   * **No engagement metrics beyond the count.** No likes, no
 *     reposts, no impressions, no rankings. The follower count
 *     is the only metric shown — the verbatim disclosure is
 *     "Theourgia keeps no engagement metrics beyond this count."
 *
 *   * **Consent-first follows** (H08 rule 19). The pending tab
 *     is wired with explicit Approve / Decline CTAs. Decline
 *     uses `--warn-soft` (consequential edit) not `--danger` —
 *     refusing a follow is a normal protective choice, not a
 *     fault.
 *
 *   * **Pending count chip uses `--warn-soft`** to signal
 *     action-needed, not red panic.
 *
 *   * Remote handle rendered in `--font-mono` `--remote` so
 *     practitioners can verify the wire form of who's following
 *     them.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import { useTablistKeys } from "../hooks/useTablistKeys.js";
import {
  FP_APPROVE_CTA,
  FP_COUNT_SUFFIX,
  FP_COUNT_SUFFIX_ONE,
  FP_DECLINE_CTA,
  FP_FOLLOWER_ACTIONS_LABEL,
  FP_FOLLOWING_YOU_PREFIX,
  FP_NO_METRICS_NOTE,
  FP_PENDING_CALLOUT,
  FP_PENDING_EMPTY_BODY,
  FP_PENDING_EMPTY_TITLE,
  FP_TAB_FOLLOWERS,
  FP_TAB_PENDING,
  FP_TITLE,
} from "./copy.js";

// ─── Data shapes ──────────────────────────────────────────────────

export interface FollowerRow {
  id: string;
  /** Display name. */
  name: string;
  /** WebFinger handle "@user@instance.tld". */
  handle: string;
  /** Tradition pill, e.g. "Thelemic". */
  tradition?: string;
  /** Display-friendly duration, e.g. "4 days". */
  since: string;
  /** Single-glyph monogram. */
  initial: string;
  /** 0..3 — controls the avatar tone rotation. */
  tone: 0 | 1 | 2 | 3;
}

export interface PendingFollowRow {
  id: string;
  name: string;
  handle: string;
  initial: string;
  tone: 0 | 1 | 2 | 3;
}

export interface FollowersPaneSurfaceProps {
  followers: readonly FollowerRow[];
  pending: readonly PendingFollowRow[];
  onApprove?: (pendingId: string) => void;
  onDecline?: (pendingId: string) => void;
  onFollowerAction?: (followerId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Style helpers ────────────────────────────────────────────────

const TONE_COLOR: Record<0 | 1 | 2 | 3, string> = {
  0: "var(--network)",
  1: "var(--peer-ok)",
  2: "var(--remote)",
  3: "var(--accent)",
};

function avatarStyle(tone: 0 | 1 | 2 | 3): CSSProperties {
  const c = TONE_COLOR[tone];
  return {
    width: 42,
    height: 42,
    borderRadius: "50%",
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontSize: 18,
    color: c,
    background: `color-mix(in srgb, ${c} 16%, transparent)`,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
  };
}

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
  padding: "22px 24px 48px",
};

// ─── Component ─────────────────────────────────────────────────────

export function FollowersPaneSurface({
  followers,
  pending,
  onApprove,
  onDecline,
  onFollowerAction,
  className,
  style,
}: FollowersPaneSurfaceProps): ReactNode {
  const titleId = useId();
  const [tab, setTab] = useState<"followers" | "pending">(
    "followers",
  );
  const tabKeys = useMemo<readonly ("followers" | "pending")[]>(
    () => ["followers", "pending"],
    [],
  );
  const { onKeyDown: onTablistKeyDown, tabIndexFor } = useTablistKeys(
    tabKeys,
    tab,
    setTab,
  );

  const countLabel = `${followers.length}${
    followers.length === 1 ? FP_COUNT_SUFFIX_ONE : FP_COUNT_SUFFIX
  }`;

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="followers-pane"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={TOPBAR}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            minWidth: 0,
          }}
        >
          <h1
            id={titleId}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 21,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {FP_TITLE}
          </h1>
          <div
            data-field="count-label"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-mute)",
            }}
          >
            {countLabel}
          </div>
        </div>
      </header>

      <main className="scroll" style={MAIN}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            role="tablist"
            onKeyDown={onTablistKeyDown}
            style={{
              display: "flex",
              gap: 4,
              borderBottom: "1px solid var(--line)",
              marginBottom: 20,
            }}
          >
            <TabButton
              label={FP_TAB_FOLLOWERS}
              selected={tab === "followers"}
              onClick={() => setTab("followers")}
              dataValue="followers"
              tabIndex={tabIndexFor("followers")}
            />
            <TabButton
              label={FP_TAB_PENDING}
              selected={tab === "pending"}
              onClick={() => setTab("pending")}
              dataValue="pending"
              pendingCount={pending.length}
              tabIndex={tabIndexFor("pending")}
            />
          </div>

          {tab === "followers" ? (
            <FollowersTab
              followers={followers}
              onFollowerAction={onFollowerAction}
            />
          ) : (
            <PendingTab
              pending={pending}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          )}
        </div>
      </main>
    </section>
  );
}

// ─── TabButton ───────────────────────────────────────────────────

function TabButton({
  label,
  selected,
  onClick,
  dataValue,
  pendingCount,
  tabIndex,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  dataValue: string;
  pendingCount?: number;
  tabIndex?: number;
}) {
  const showChip = pendingCount !== undefined && pendingCount > 0;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={tabIndex}
      onClick={onClick}
      data-tab={dataValue}
      data-selected={selected}
      style={{
        padding: "10px 16px",
        background: "transparent",
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: selected ? "var(--ink)" : "var(--ink-mute)",
        borderWidth: 0,
        borderBottomWidth: 2,
        borderBottomStyle: "solid",
        borderBottomColor: selected ? "var(--accent)" : "transparent",
        marginBottom: -1,
        cursor: "pointer",
      }}
    >
      {label}
      {showChip ? (
        <span
          data-field="pending-count-chip"
          style={{
            marginLeft: 8,
            padding: "1px 8px",
            borderRadius: 20,
            background: "var(--warn-soft)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--warn-border)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--warn)",
          }}
        >
          {pendingCount}
        </span>
      ) : null}
    </button>
  );
}

// ─── FollowersTab ─────────────────────────────────────────────────

function FollowersTab({
  followers,
  onFollowerAction,
}: {
  followers: readonly FollowerRow[];
  onFollowerAction?: (id: string) => void;
}) {
  return (
    <>
      <div
        data-field="no-metrics-note"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginBottom: 14,
        }}
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
          aria-hidden="true"
        >
          <path d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
        {FP_NO_METRICS_NOTE}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 11,
        }}
        data-field="followers-grid"
      >
        {followers.map((f) => (
          <div
            key={f.id}
            data-follower-id={f.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 15px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
            }}
          >
            <span aria-hidden="true" style={avatarStyle(f.tone)}>
              {f.initial}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                data-field="follower-name"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </div>
              <div
                data-field="follower-handle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--remote)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.handle}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                {f.tradition ? (
                  <span
                    data-field="follower-tradition"
                    style={{
                      padding: "1px 8px",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "var(--line)",
                      borderRadius: 20,
                      fontFamily: "var(--font-ui)",
                      fontSize: 10.5,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {f.tradition}
                  </span>
                ) : null}
                <span
                  data-field="follower-since"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                  }}
                >
                  {FP_FOLLOWING_YOU_PREFIX}
                  {f.since}
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label={FP_FOLLOWER_ACTIONS_LABEL}
              onClick={() => onFollowerAction?.(f.id)}
              data-action="follower-kebab"
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--r-sm)",
                color: "var(--ink-mute)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── PendingTab ──────────────────────────────────────────────────

function PendingTab({
  pending,
  onApprove,
  onDecline,
}: {
  pending: readonly PendingFollowRow[];
  onApprove?: (id: string) => void;
  onDecline?: (id: string) => void;
}) {
  return (
    <>
      <div
        data-field="pending-callout"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          padding: "12px 14px",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--network-line)",
          borderRadius: "var(--r-md)",
          background: "var(--network-soft)",
          marginBottom: 16,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "flex",
            color: "var(--network)",
            flex: "none",
            marginTop: 1,
          }}
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l3 2" />
          </svg>
        </span>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: "var(--ink-soft)",
            lineHeight: 1.45,
          }}
        >
          {FP_PENDING_CALLOUT}
        </span>
      </div>

      {pending.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
          data-field="pending-list"
        >
          {pending.map((p) => (
            <div
              key={p.id}
              data-pending-id={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 15px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
              }}
            >
              <span aria-hidden="true" style={avatarStyle(p.tone)}>
                {p.initial}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  data-field="pending-name"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 14.5,
                    color: "var(--ink)",
                  }}
                >
                  {p.name}
                </div>
                <div
                  data-field="pending-handle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--remote)",
                  }}
                >
                  {p.handle}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                <button
                  type="button"
                  onClick={() => onApprove?.(p.id)}
                  data-action="approve"
                  style={{
                    padding: "8px 15px",
                    borderRadius: "var(--r-md)",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {FP_APPROVE_CTA}
                </button>
                <button
                  type="button"
                  onClick={() => onDecline?.(p.id)}
                  data-action="decline"
                  style={{
                    padding: "8px 14px",
                    borderRadius: "var(--r-md)",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: "var(--warn-border)",
                    background: "var(--warn-soft)",
                    color: "var(--warn)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {FP_DECLINE_CTA}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-field="pending-empty"
          style={{
            padding: 34,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "var(--line-2)",
            borderRadius: "var(--r-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--ink)",
              marginBottom: 5,
            }}
          >
            {FP_PENDING_EMPTY_TITLE}
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-mute)",
            }}
          >
            {FP_PENDING_EMPTY_BODY}
          </div>
        </div>
      )}
    </>
  );
}
