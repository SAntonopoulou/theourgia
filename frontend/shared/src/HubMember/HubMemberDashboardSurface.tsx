/**
 * HubMemberDashboardSurface — H08 §S3 Cluster A surface 6.
 *
 * Faithful port of ``Theourgia Hub Member Dashboard.dc.html``.
 * Three tabs: Feed (default) · My submissions · Sharing settings.
 *
 * Honesty rules wired:
 *
 *   1. **Feed is chronological — never algorithmic** (rule 19).
 *      Day separators ("Today", "Yesterday", an ISO date) sit
 *      above their items; items inside each day stay in caller
 *      order. NO "trending" / "popular" / "for you" / re-ranking.
 *   2. **No inline reactions** on feed cards (rule 18). Boost /
 *      like counts appear ONLY on the per-entry public reader,
 *      never on the network feed.
 *   3. **Every submission row carries Withdraw** (rule 21). The
 *      cache-persistence disclosure renders verbatim at the
 *      bottom of the table: "Withdrawing pulls content from the
 *      hub. Content already mirrored may persist in caches."
 *   4. **Sharing toggles default OFF** (rule 28). The brief is
 *      explicit: every share is opt-in. The component takes the
 *      current state from the caller — the route fixtures set
 *      the canonical demo state with all four toggles off
 *      (except one in the .dc.html demo to show the "on" chrome).
 *   5. **Status pills use --warn / --peer-ok / --ink-mute** —
 *      never --danger (rule 2). Pending → --warn; Approved →
 *      --peer-ok; Sent back / Withdrawn → --ink-mute (neutral,
 *      not a failure).
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";

import {
  HM_COL_CONTENT,
  HM_COL_STATUS,
  HM_COL_SUBMITTED,
  HM_NEWSLETTER_CTA,
  HM_SHARING_HEADER,
  HM_SHARING_TOGGLES,
  HM_STATUS_LABELS,
  HM_TAB_KEYS,
  HM_TAB_LABELS,
  HM_WITHDRAW_DISCLOSURE,
  HM_WITHDRAW_LABEL,
  HM_YOURE_A,
  HM_YOURE_AN,
  type HubFeedItemKind,
  type HubMemberTab,
  type HubSharingToggle,
  type HubSubmissionStatus,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

export interface HubFeedItem {
  id: string;
  /** Contributor DID, rendered --font-mono. */
  did: string;
  kind: HubFeedItemKind;
  /** Display-friendly relative time, e.g. "2h ago". */
  time: string;
  /** One-line preview (truncated by CSS). */
  preview: string;
}

export interface HubFeedDay {
  /** Display label for the separator: "Today", "Yesterday", or
   *  an ISO date — caller-formatted. */
  label: string;
  items: readonly HubFeedItem[];
}

export interface HubMySubmission {
  id: string;
  title: string;
  /** Display-friendly submitted-at, e.g. "2h ago". */
  submitted: string;
  status: HubSubmissionStatus;
}

/** A simple closed-set of role labels used in the topbar
 *  "you're a(n) {role}" line. The surface picks the indefinite
 *  article from the first vowel of the role string. */
export interface HubMemberDashboardSurfaceProps {
  hubName: string;
  /** Single-glyph monogram for the topbar tile. */
  monogram: string;
  /** Tradition tag — the topbar shows "Hellenic · you're an officer". */
  tradition: string;
  /** Viewer's role in this hub. */
  role: string;
  /** Chronological list of feed days. The surface respects caller
   *  order — it does NOT re-sort (rule 19). */
  feedDays: readonly HubFeedDay[];
  /** The member's own submissions to this hub. */
  submissions: readonly HubMySubmission[];
  /** Current sharing-toggle state. The brief locks ALL FOUR to
   *  default OFF; the consumer (admin route) initialises this to
   *  ``{}`` for the empty case. */
  sharingState: Readonly<Partial<Record<HubSharingToggle, boolean>>>;
  initialTab?: HubMemberTab;
  /** Newsletter composer CTA in the topbar. */
  onOpenNewsletter?: () => void;
  /** Per-row "Withdraw" — fires for every status, even already
   *  withdrawn (the brief permits idempotent re-attempts). */
  onWithdraw?: (submissionId: string) => void;
  /** Fires on toggle. The consumer flips the value in
   *  sharingState and re-renders. */
  onSharingToggle?: (
    toggle: HubSharingToggle,
    next: boolean,
  ) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Tiny indefinite-article helper. Picks "an" for vowels, "a" for
 *  the rest. Used in the topbar's "you're a(n) {role}" line. */
function roleArticle(role: string): string {
  const first = role.trim().charAt(0).toLowerCase();
  if ("aeiou".includes(first)) return HM_YOURE_AN;
  return HM_YOURE_A;
}

/** Status pill tokens. All four are the --warn / --peer-ok /
 *  --ink-mute family — never --danger (rule 2). */
function statusPillTokens(status: HubSubmissionStatus): {
  border: string;
  bg: string;
  ink: string;
} {
  switch (status) {
    case "pending":
      return {
        border: "var(--warn)",
        bg: "var(--warn-soft)",
        ink: "var(--warn)",
      };
    case "approved":
      return {
        border: "var(--peer-ok)",
        bg: "var(--peer-ok-soft)",
        ink: "var(--peer-ok)",
      };
    case "sent-back":
    case "withdrawn":
      return {
        border: "var(--line)",
        bg: "transparent",
        ink: "var(--ink-mute)",
      };
  }
}

// ─── Style atoms ───────────────────────────────────────────────────

const TOPBAR: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const TAB_ROW: CSSProperties = {
  display: "flex",
  gap: 2,
  overflowX: "auto",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
  padding: "0 18px",
};

const TAB_BASE: CSSProperties = {
  padding: "13px 16px 11px",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  color: "var(--ink-mute)",
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderLeftWidth: 0,
  borderBottomWidth: 2,
  borderBottomStyle: "solid",
  borderBottomColor: "transparent",
  background: "transparent",
  cursor: "pointer",
  flex: "none",
};

const TAB_ON: CSSProperties = {
  ...TAB_BASE,
  color: "var(--ink)",
  borderBottomColor: "var(--network)",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "22px 24px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
};

// ─── Component ─────────────────────────────────────────────────────

export function HubMemberDashboardSurface({
  hubName,
  monogram,
  tradition,
  role,
  feedDays,
  submissions,
  sharingState,
  initialTab = "feed",
  onOpenNewsletter,
  onWithdraw,
  onSharingToggle,
  className,
  style,
}: HubMemberDashboardSurfaceProps) {
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<HubMemberTab>(initialTab);

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="hub-member-dashboard"
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            minWidth: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-md)",
              background: "var(--network-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
              fontFamily: "var(--font-display)",
              fontSize: 17,
              color: "var(--network)",
            }}
          >
            {monogram}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              id={titleId}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 19,
                lineHeight: 1.05,
              }}
            >
              {hubName}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
              data-field="meta"
            >
              {tradition} · {roleArticle(role)}
              {role}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenNewsletter}
          data-action="newsletter"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 7,
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
          {HM_NEWSLETTER_CTA}
        </button>
      </header>

      <nav
        className="scroll"
        aria-label="Hub member"
        style={TAB_ROW}
        data-block="hub-member-tabs"
      >
        {HM_TAB_KEYS.map((k) => {
          const on = activeTab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              aria-current={on ? "page" : undefined}
              data-tab={k}
              style={on ? TAB_ON : TAB_BASE}
            >
              {HM_TAB_LABELS[k]}
            </button>
          );
        })}
      </nav>

      <div className="scroll" style={MAIN}>
        <div style={INNER}>
          {activeTab === "feed" ? <FeedTab feedDays={feedDays} /> : null}
          {activeTab === "subs" ? (
            <SubsTab
              submissions={submissions}
              onWithdraw={onWithdraw}
            />
          ) : null}
          {activeTab === "sharing" ? (
            <SharingTab
              sharingState={sharingState}
              onSharingToggle={onSharingToggle}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Feed tab ─────────────────────────────────────────────────────

function FeedTab({
  feedDays,
}: {
  feedDays: readonly HubFeedDay[];
}): ReactNode {
  return (
    <div data-tab-panel="feed">
      {feedDays.map((d) => (
        <section
          key={d.label}
          style={{ marginBottom: 22 }}
          data-day={d.label}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--ink-soft)",
              marginBottom: 12,
            }}
            data-field="day-label"
          >
            {d.label}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {d.items.map((i) => (
              <article
                key={i.id}
                data-feed-id={i.id}
                data-kind={i.kind}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    flexWrap: "wrap",
                    marginBottom: 7,
                  }}
                >
                  <span
                    data-field="did"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                  >
                    {i.did}
                  </span>
                  <span
                    data-pill="kind"
                    style={{
                      padding: "2px 9px",
                      border: "1px solid var(--line-2)",
                      borderRadius: "999px",
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {i.kind}
                  </span>
                  <span
                    data-field="time"
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                      marginLeft: "auto",
                    }}
                  >
                    {i.time}
                  </span>
                </div>
                <p
                  data-field="preview"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 15,
                    color: "var(--ink)",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {i.preview}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ─── My submissions tab ───────────────────────────────────────────

function SubsTab({
  submissions,
  onWithdraw,
}: {
  submissions: readonly HubMySubmission[];
  onWithdraw?: (id: string) => void;
}): ReactNode {
  const TABLE: CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
  };
  const HEADER: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1.2fr",
    background: "var(--bg-3)",
    fontFamily: "var(--font-ui)",
    fontSize: 10.5,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--ink-mute)",
  };
  return (
    <div data-tab-panel="subs">
      <div style={TABLE}>
        <div style={HEADER}>
          <span style={{ padding: "11px 16px" }}>{HM_COL_CONTENT}</span>
          <span style={{ padding: "11px 12px" }}>{HM_COL_SUBMITTED}</span>
          <span style={{ padding: "11px 12px" }}>{HM_COL_STATUS}</span>
        </div>
        {submissions.map((s) => {
          const tokens = statusPillTokens(s.status);
          return (
            <div
              key={s.id}
              data-submission-id={s.id}
              data-status={s.status}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.2fr",
                borderTop: "1px solid var(--line)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  padding: "13px 16px",
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink)",
                }}
                data-field="title"
              >
                {s.title}
              </span>
              <span
                style={{
                  padding: "13px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--ink-mute)",
                }}
                data-field="submitted"
              >
                {s.submitted}
              </span>
              <span
                style={{
                  padding: "13px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <span
                  data-pill="status"
                  style={{
                    padding: "2px 9px",
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "999px",
                    background: tokens.bg,
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: tokens.ink,
                  }}
                >
                  {HM_STATUS_LABELS[s.status]}
                </span>
                <button
                  type="button"
                  onClick={() => onWithdraw?.(s.id)}
                  data-action="withdraw"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-mute)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {HM_WITHDRAW_LABEL}
                </button>
              </span>
            </div>
          );
        })}
      </div>
      <p
        data-field="withdraw-disclosure"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          margin: "12px 0 0",
          lineHeight: 1.45,
        }}
      >
        {HM_WITHDRAW_DISCLOSURE}
      </p>
    </div>
  );
}

// ─── Sharing settings tab ─────────────────────────────────────────

function SharingTab({
  sharingState,
  onSharingToggle,
}: {
  sharingState: Readonly<Partial<Record<HubSharingToggle, boolean>>>;
  onSharingToggle?: (
    toggle: HubSharingToggle,
    next: boolean,
  ) => void;
}): ReactNode {
  return (
    <div data-tab-panel="sharing">
      <p
        data-field="sharing-header"
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          margin: "0 0 18px",
        }}
      >
        {HM_SHARING_HEADER}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {HM_SHARING_TOGGLES.map((t) => {
          const on = sharingState[t.key] ?? false;
          return (
            <label
              key={t.key}
              data-toggle={t.key}
              data-on={on}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 16px",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--bg-2)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) =>
                  onSharingToggle?.(t.key, e.currentTarget.checked)
                }
                data-input={t.key}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
              />
              <span
                aria-hidden="true"
                data-visual-track={t.key}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 11,
                  background: on
                    ? "var(--network-soft)"
                    : "var(--bg-3)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: on
                    ? "var(--network-line)"
                    : "var(--line-2)",
                  position: "relative",
                  flex: "none",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 1,
                    [on ? "right" : "left"]: 1,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: on
                      ? "var(--network)"
                      : "var(--ink-mute)",
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 15,
                  color: "var(--ink)",
                }}
              >
                {t.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
