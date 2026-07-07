/**
 * MyNetworksSurface — H08 §S3 Cluster A surface 1.
 *
 * Faithful port of ``Theourgia My Networks.dc.html`` from the H08
 * handoff bundle. The surface is the entry point to Phase 12
 * federation chrome — every other Phase 12/13 surface is reached
 * either through this index or through VaultNav's Network section.
 *
 * Honesty rules wired here (from the H08 supplement):
 *
 *   1. **Accept is `--warn-soft`, NOT `--danger`** (carry-forward
 *      rule 2). Accepting an invitation is a commitment but not a
 *      Visibility → Public step.
 *   2. **No member-count on pending invitations.** A hub's
 *      membership numbers are admin-internal; an invite is about
 *      "this hub wants you", not "this hub is popular."
 *   3. **No red activity dots / streak badges on the membership
 *      cards.** "Last activity 3 days ago" is the only signal,
 *      and it sits in `--ink-mute`.
 *   4. **Empty state copy is verbatim** from the H08 supplement
 *      ("Hubs are how practitioners federate selectively…"). The
 *      surface's defining honesty moment — federation is opt-in,
 *      selective, and reversible-feeling.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
} from "react";

import {
  type HubRole,
  MN_ACCEPT_LABEL,
  MN_ACTIVE_HEADING,
  MN_DECLINE_LABEL,
  MN_DISCOVER_CTA,
  MN_EMPTY_BODY,
  MN_EMPTY_CTA,
  MN_EMPTY_TITLE,
  MN_INVITED_BY_PREFIX,
  MN_LAST_ACTIVITY_PREFIX,
  MN_PENDING_HEADING,
  MN_SUBTITLE,
  MN_TITLE,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

/**
 * The membership-list card shape. Mirrors the H08 supplement's
 * ``HubMembership`` type — the surface owns its display string
 * (``lastActivity``) so a future endpoint that returns a structured
 * timestamp doesn't force every consumer to format it.
 */
export interface HubMembershipCard {
  /** Hub id (uuid). */
  hubId: string;
  /** Hub display name (already i18n-resolved by the caller). */
  hubName: string;
  /** Tradition tag — single short string, e.g. "Hellenic". */
  tradition: string;
  role: HubRole;
  /** Human time-since string ("3 days ago", "just now"). */
  lastActivity: string;
  /** Single-glyph monogram for the tile (e.g. "Κ", "A"). */
  initial: string;
  /** Optional CSS color for the avatar tile background. */
  initialBg?: string;
}

/**
 * The invitation-row shape. ``invitedBy`` is the inviter's full DID
 * (``did:theourgia:{host}:{slug}``); the surface renders it in
 * `--font-mono` per the H08 identity-disclosure rule.
 */
export interface HubInvitationCard {
  hubId: string;
  hubName: string;
  invitedBy: string;
  /** Optional free-form note from the inviter. */
  note?: string;
  initial: string;
}

export interface MyNetworksSurfaceProps {
  /** Active hub memberships. Order is respected; no surface-side sort. */
  hubs: readonly HubMembershipCard[];
  /** Pending hub invitations. Order is respected. */
  invites: readonly HubInvitationCard[];
  /** "+ Discover hubs" CTA. Defaults to navigating to /networks/discover. */
  onDiscover?: () => void;
  /** Hub-card click handler. Defaults to navigating to the hub. */
  onOpenHub?: (hubId: string) => void;
  /** "Accept" button on a pending invitation. */
  onAcceptInvite?: (hubId: string) => void;
  /** "Decline" button on a pending invitation. */
  onDeclineInvite?: (hubId: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Style atoms (CSS-var only; matches the .dc.html literally) ────

const HEADER_BAND: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
  borderBottom: "1px solid var(--line)",
  background: "var(--bg)",
};

const HEADER_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 21,
  lineHeight: 1.1,
};

const HEADER_SUBTITLE: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  color: "var(--ink-mute)",
  marginTop: 2,
};

const HEADER_CTA: CSSProperties = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 15px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

const MAIN: CSSProperties = {
  overflowY: "auto",
  minHeight: 0,
  padding: "26px 26px 50px",
};

const INNER: CSSProperties = {
  maxWidth: 840,
  margin: "0 auto",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 12,
};

const LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const HUB_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 15,
  padding: "15px 18px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  textAlign: "left",
  width: "100%",
  cursor: "pointer",
};

const AVATAR_TILE: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "var(--r-md)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  fontFamily: "var(--font-display)",
  fontSize: 20,
  color: "var(--network)",
};

const HUB_NAME: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 18,
  color: "var(--ink)",
};

const TRADITION_PILL: CSSProperties = {
  padding: "2px 9px",
  border: "1px solid var(--network-line)",
  borderRadius: "999px",
  background: "var(--network-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--network)",
};

const ROLE_PILL: CSSProperties = {
  padding: "2px 9px",
  border: "1px solid var(--line-2)",
  borderRadius: "999px",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-soft)",
};

const META: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--ink-mute)",
};

const INVITE_ROW: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 15,
  padding: "15px 18px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const INVITE_BY: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--ink-mute)",
  marginBottom: 6,
};

const INVITE_NOTE: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontSize: 14,
  color: "var(--ink-soft)",
  lineHeight: 1.45,
  margin: 0,
};

/**
 * The Accept button uses ``--warn-soft`` chrome — accepting an
 * invitation is a commitment but NEVER ``--danger`` (rule 2).
 */
const ACCEPT_BUTTON: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "var(--r-md)",
  background: "var(--warn-soft)",
  border: "1px solid var(--warn-border)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--ink)",
  cursor: "pointer",
};

const DECLINE_BUTTON: CSSProperties = {
  padding: "8px 14px",
  borderRadius: "var(--r-md)",
  border: "1px solid var(--line-2)",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const EMPTY_WRAP: CSSProperties = {
  maxWidth: 480,
  margin: "9vh auto 0",
  textAlign: "center",
};

const EMPTY_ICON: CSSProperties = {
  width: 64,
  height: 64,
  margin: "0 auto 20px",
  borderRadius: "50%",
  border: "1px solid var(--network-line)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--network)",
};

const EMPTY_TITLE: CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 24,
  margin: "0 0 12px",
};

const EMPTY_BODY: CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 15.5,
  lineHeight: 1.6,
  color: "var(--ink-soft)",
  margin: "0 0 24px",
};

const EMPTY_CTA: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 22px",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontWeight: 700,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

// ─── Small inline icons (stroke 1.6, engraving style) ──────────────

function PlusIcon({ size = 15 }: { size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
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

function ChevronIcon(): ReactNode {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-mute)"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function NetworkGlyph(): ReactNode {
  // Same engraving as VaultNav's `networks` icon — three nodes in
  // a triangle. Used in the empty state.
  return (
    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3" />
      <circle cx="5.5" cy="17" r="2.5" />
      <circle cx="18.5" cy="17" r="2.5" />
      <path d="M12 10v3M10 14l-3 2M14 14l3 2" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function MyNetworksSurface({
  hubs,
  invites,
  onDiscover,
  onOpenHub,
  onAcceptInvite,
  onDeclineInvite,
  className,
  style,
}: MyNetworksSurfaceProps) {
  const titleId = useId();
  const isEmpty = hubs.length === 0 && invites.length === 0;

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="my-networks"
      style={{ minWidth: 0, minHeight: 0, ...style }}
    >
      <header style={HEADER_BAND}>
        <div style={{ minWidth: 0 }}>
          <h1 id={titleId} style={HEADER_TITLE}>
            {MN_TITLE}
          </h1>
          <div style={HEADER_SUBTITLE}>{MN_SUBTITLE}</div>
        </div>
        <button
          type="button"
          style={HEADER_CTA}
          onClick={onDiscover}
          data-action="discover"
        >
          <PlusIcon />
          {MN_DISCOVER_CTA}
        </button>
      </header>

      <div className="scroll" style={MAIN}>
        <div style={INNER}>
          {isEmpty ? (
            <EmptyState onDiscover={onDiscover} />
          ) : (
            <>
              {hubs.length > 0 ? (
                <section
                  aria-label={MN_ACTIVE_HEADING}
                  style={{ marginBottom: 30 }}
                >
                  <div style={EYEBROW}>{MN_ACTIVE_HEADING}</div>
                  <ul
                    style={{ ...LIST, listStyle: "none", padding: 0, margin: 0 }}
                  >
                    {hubs.map((h) => (
                      <li key={h.hubId}>
                        <button
                          type="button"
                          style={HUB_ROW}
                          onClick={() => onOpenHub?.(h.hubId)}
                          data-hub-id={h.hubId}
                          data-role={h.role}
                        >
                          <span
                            style={{
                              ...AVATAR_TILE,
                              background: h.initialBg ?? "var(--bg-3)",
                            }}
                            aria-hidden="true"
                          >
                            {h.initial}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                flexWrap: "wrap",
                                marginBottom: 3,
                              }}
                            >
                              <span style={HUB_NAME}>{h.hubName}</span>
                              <span
                                style={TRADITION_PILL}
                                data-pill="tradition"
                              >
                                {h.tradition}
                              </span>
                              <span style={ROLE_PILL} data-pill="role">
                                {h.role}
                              </span>
                            </span>
                            <span
                              style={{ ...META, display: "block" }}
                              data-meta="activity"
                            >
                              {MN_LAST_ACTIVITY_PREFIX}
                              {h.lastActivity}
                            </span>
                          </span>
                          <ChevronIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {invites.length > 0 ? (
                <section aria-label={MN_PENDING_HEADING}>
                  <div style={EYEBROW}>{MN_PENDING_HEADING}</div>
                  <ul
                    style={{ ...LIST, listStyle: "none", padding: 0, margin: 0 }}
                  >
                    {invites.map((i) => (
                      <li key={i.hubId}>
                        <div
                          style={INVITE_ROW}
                          data-invite-id={i.hubId}
                        >
                          <span
                            style={{
                              ...AVATAR_TILE,
                              background: "var(--bg-3)",
                            }}
                            aria-hidden="true"
                          >
                            {i.initial}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize: 18,
                                color: "var(--ink)",
                                marginBottom: 2,
                              }}
                            >
                              {i.hubName}
                            </div>
                            <div style={INVITE_BY} data-field="invited-by">
                              {MN_INVITED_BY_PREFIX}
                              {i.invitedBy}
                            </div>
                            {i.note ? (
                              <p style={INVITE_NOTE} data-field="note">
                                {i.note}
                              </p>
                            ) : null}
                          </div>
                          <div
                            style={{ display: "flex", gap: 8, flex: "none" }}
                          >
                            <button
                              type="button"
                              style={ACCEPT_BUTTON}
                              onClick={() => onAcceptInvite?.(i.hubId)}
                              data-action="accept"
                            >
                              {MN_ACCEPT_LABEL}
                            </button>
                            <button
                              type="button"
                              style={DECLINE_BUTTON}
                              onClick={() => onDeclineInvite?.(i.hubId)}
                              data-action="decline"
                            >
                              {MN_DECLINE_LABEL}
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Empty state ──────────────────────────────────────────────────

function EmptyState({
  onDiscover,
}: {
  onDiscover?: () => void;
}): ReactNode {
  return (
    <div style={EMPTY_WRAP} data-state="empty">
      <div style={EMPTY_ICON}>
        <NetworkGlyph />
      </div>
      <h2 style={EMPTY_TITLE}>{MN_EMPTY_TITLE}</h2>
      <p style={EMPTY_BODY}>{MN_EMPTY_BODY}</p>
      <button type="button" style={EMPTY_CTA} onClick={onDiscover}>
        {MN_EMPTY_CTA}
      </button>
    </div>
  );
}
