/**
 * NetworkBrowserSurface — H08 §S3 Cluster A surface 2.
 *
 * Faithful port of ``Theourgia Network Browser.dc.html``. The
 * federation peer directory: every instance your instance has
 * exchanged a handshake with (successful / pending / refused /
 * blocked) plus the local instance pinned at the top.
 *
 * Honesty rules wired:
 *
 *   1. **Status chrome is NEUTRAL.** Successful → ``--peer-ok``
 *      (a calm green); pending → ``--peer-pending`` (amber);
 *      refused + blocked are warm-clay ``--peer-refused`` /
 *      ``--peer-blocked`` — ALL FOUR are the ``--warn`` family,
 *      NONE is ``--danger`` (rule 2 carry-forward).
 *   2. **The local instance is PINNED at the top regardless of
 *      filters**, in ``--network`` framing. The "This is your
 *      instance" chip names it explicitly so the practitioner
 *      always knows where they are.
 *   3. **The community-blocklist subscription is OPT-IN**. The
 *      trust-ledger band renders the affordance as a deliberate
 *      single CTA labelled "Configure" — the subscription itself
 *      is OFF by default ("Not subscribed.").
 *   4. **No instance-reputation labels** ("trusted", "untrusted",
 *      "verified") — peers are tones-of-warn, never colour-coded
 *      to a judgement.
 */

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

import {
  type HandshakeState,
  NB_FILTER_STATUS_LABEL,
  NB_FILTER_TRADITION_LABEL,
  NB_HEARTBEAT_PREFIX,
  NB_LOCAL_PILL,
  NB_STATUS_KEYS,
  NB_STATUS_LABELS,
  NB_SUBTITLE,
  NB_TITLE,
  NB_TRUST_CTA,
  NB_TRUST_NOT_SUBSCRIBED,
  NB_TRUST_TITLE,
} from "./copy.js";

// ─── Data shapes ───────────────────────────────────────────────────

/** Mirror of the H08 supplement's ``PeerInstance`` type. */
export interface PeerInstance {
  /** Bare host, e.g. ``aurora.example``. Rendered in --font-mono. */
  domain: string;
  /** Tradition tag (optional). */
  tradition?: string;
  handshake: HandshakeState;
  /** Display-friendly relative time, e.g. ``"4 minutes ago"`` or
   *  ``"never"``. The surface doesn't compute this — the route
   *  formats per the practitioner's locale. */
  heartbeat: string;
  /** True only for the row representing THIS instance. Always
   *  pinned at the top regardless of filters. */
  isLocal: boolean;
}

export interface NetworkBrowserSurfaceProps {
  /** Every known peer. The surface pins ``isLocal`` to the top. */
  peers: readonly PeerInstance[];
  /** Tradition chips for the filter rail. The surface doesn't yet
   *  wire the filtering logic for these — the chips render so the
   *  designer's intent is preserved; a future batch ships the
   *  actual filter. */
  traditions?: readonly string[];
  /** Trust-ledger subscription state. Defaults to NOT subscribed. */
  blocklistSubscribed?: boolean;
  /** "Configure" CTA on the trust-ledger band. */
  onConfigureBlocklist?: () => void;
  /** Kebab-menu action on a peer row (per-row "Instance actions"). */
  onPeerAction?: (domain: string) => void;
  className?: string;
  style?: CSSProperties;
}

// ─── Status pill chrome (CSS-var only; no raw colour) ──────────────

/**
 * Returns the (border, background, ink) tokens for the four
 * handshake states. All four are the ``--warn`` family; NONE is
 * ``--danger`` (rule 2).
 */
function pillTokens(state: HandshakeState): {
  border: string;
  bg: string;
  ink: string;
} {
  switch (state) {
    case "successful":
      return {
        border: "var(--peer-ok)",
        bg: "var(--peer-ok-soft)",
        ink: "var(--peer-ok)",
      };
    case "pending":
      return {
        border: "var(--peer-pending)",
        bg: "var(--peer-pending-soft)",
        ink: "var(--peer-pending)",
      };
    case "refused":
      return {
        border: "var(--peer-refused)",
        bg: "var(--peer-refused-soft)",
        ink: "var(--peer-refused)",
      };
    case "blocked":
      return {
        border: "var(--peer-blocked)",
        bg: "var(--peer-blocked-soft)",
        ink: "var(--peer-blocked)",
      };
  }
}

// ─── Style atoms ───────────────────────────────────────────────────

const HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "13px 24px",
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
  flex: "0 0 300px",
  minWidth: 0,
  borderRight: "1px solid var(--line)",
  background: "var(--bg-2)",
  padding: "18px 16px",
  overflowY: "auto",
};

const EYEBROW: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const FILTER_LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginBottom: 20,
};

const FILTER_ROW_BASE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  padding: "8px 10px",
  borderRadius: "var(--r-sm)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  // Long-hand border so the "on" state can swap borderColor cleanly
  // (React 19 warns on shorthand/long-hand mixing).
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
};

const FILTER_ROW_ON: CSSProperties = {
  ...FILTER_ROW_BASE,
  color: "var(--ink)",
  background: "var(--accent-soft)",
  borderColor: "var(--line-2)",
};

const MAIN: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflowY: "auto",
  padding: "20px 24px 30px",
  display: "flex",
  flexDirection: "column",
};

const ROW_LOCAL: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "15px 18px",
  border: "1px solid var(--network-line)",
  borderRadius: "var(--r-md)",
  background: "var(--network-soft)",
};

const ROW_PEER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "15px 18px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

const DOMAIN: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  color: "var(--ink)",
};

const META: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11.5,
  color: "var(--ink-mute)",
};

const LOCAL_CHIP: CSSProperties = {
  padding: "3px 10px",
  borderRadius: "999px",
  background: "var(--bg-2)",
  border: "1px solid var(--line-2)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  color: "var(--ink-mute)",
  flex: "none",
};

const TRUST_BAND: CSSProperties = {
  maxWidth: 840,
  marginTop: 24,
  padding: "16px 18px",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const TRUST_CTA: CSSProperties = {
  padding: "8px 16px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
};

// ─── Glyphs ───────────────────────────────────────────────────────

function ServerGlyph(): ReactNode {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 4v16" />
    </svg>
  );
}

function KebabGlyph(): ReactNode {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export function NetworkBrowserSurface({
  peers,
  traditions,
  blocklistSubscribed = false,
  onConfigureBlocklist,
  onPeerAction,
  className,
  style,
}: NetworkBrowserSurfaceProps) {
  const titleId = useId();
  const [activeStatus, setActiveStatus] = useState<HandshakeState | "all">(
    "all",
  );

  /** Pre-compute counts per status across the full set (NOT the
   *  filtered set) so the rail labels stay stable as filters apply. */
  const counts = useMemo(() => {
    const out: Record<HandshakeState, number> = {
      successful: 0,
      pending: 0,
      refused: 0,
      blocked: 0,
    };
    for (const p of peers) {
      if (!p.isLocal) out[p.handshake] += 1;
    }
    return out;
  }, [peers]);

  const localPeer = useMemo(
    () => peers.find((p) => p.isLocal),
    [peers],
  );

  /** Apply the active filter to the non-local peers; preserve
   *  caller order. */
  const visiblePeers = useMemo(() => {
    const non = peers.filter((p) => !p.isLocal);
    if (activeStatus === "all") return non;
    return non.filter((p) => p.handshake === activeStatus);
  }, [peers, activeStatus]);

  return (
    <section
      aria-labelledby={titleId}
      className={className}
      data-surface="network-browser"
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        ...style,
      }}
    >
      <header style={HEADER}>
        <div style={{ minWidth: 0 }}>
          <h1
            id={titleId}
            style={{ fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1.1, margin: 0 }}
          >
            {NB_TITLE}
          </h1>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 2 }}>
            {NB_SUBTITLE}
          </div>
        </div>
      </header>

      <div style={COLUMNS}>
        {/* Filter rail */}
        <aside className="scroll" style={RAIL} aria-label="Filters">
          <div style={EYEBROW}>{NB_FILTER_STATUS_LABEL}</div>
          <div style={FILTER_LIST} role="group" aria-label={NB_FILTER_STATUS_LABEL}>
            {NB_STATUS_KEYS.map((k) => {
              const on = activeStatus === k;
              const tokens = pillTokens(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setActiveStatus((prev) => (prev === k ? "all" : k))
                  }
                  aria-pressed={on}
                  data-filter-status={k}
                  style={on ? FILTER_ROW_ON : FILTER_ROW_BASE}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: tokens.ink,
                      flex: "none",
                    }}
                  />
                  {NB_STATUS_LABELS[k]}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-mute)",
                    }}
                    data-count={k}
                  >
                    {counts[k]}
                  </span>
                </button>
              );
            })}
          </div>

          {traditions && traditions.length > 0 ? (
            <>
              <div style={EYEBROW}>{NB_FILTER_TRADITION_LABEL}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {traditions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    style={{
                      padding: "6px 11px",
                      borderRadius: "999px",
                      border: "1px solid var(--line)",
                      background: "var(--bg)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                    data-filter-tradition={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </aside>

        {/* Peer list */}
        <main className="scroll" style={MAIN}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 840,
            }}
          >
            {localPeer ? (
              <div style={ROW_LOCAL} data-peer-local="true">
                <span style={{ display: "flex", color: "var(--network)", flex: "none" }}>
                  <ServerGlyph />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={DOMAIN} data-field="domain">
                    {localPeer.domain}
                  </div>
                  {localPeer.tradition ? (
                    <div style={META}>{localPeer.tradition}</div>
                  ) : null}
                </div>
                <span style={LOCAL_CHIP}>{NB_LOCAL_PILL}</span>
              </div>
            ) : null}

            {visiblePeers.map((p) => {
              const tokens = pillTokens(p.handshake);
              return (
                <div
                  key={p.domain}
                  style={ROW_PEER}
                  data-peer={p.domain}
                  data-status={p.handshake}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={DOMAIN} data-field="domain">
                      {p.domain}
                    </div>
                    <div style={META} data-field="meta">
                      {p.tradition ? `${p.tradition} · ` : ""}
                      {NB_HEARTBEAT_PREFIX}
                      {p.heartbeat}
                    </div>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 11px",
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "999px",
                      background: tokens.bg,
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: tokens.ink,
                      flex: "none",
                    }}
                    data-pill="status"
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: tokens.ink,
                      }}
                    />
                    {NB_STATUS_LABELS[p.handshake]}
                  </span>
                  <button
                    type="button"
                    aria-label="Instance actions"
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
                    onClick={() => onPeerAction?.(p.domain)}
                    data-action="peer-kebab"
                  >
                    <KebabGlyph />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Trust ledger band */}
          <div style={TRUST_BAND} data-block="trust-ledger">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink)" }}
              >
                {NB_TRUST_TITLE}
              </div>
              <div
                style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}
                data-field="blocklist-status"
              >
                {blocklistSubscribed
                  ? "Subscribed."
                  : NB_TRUST_NOT_SUBSCRIBED}
              </div>
            </div>
            <button
              type="button"
              style={TRUST_CTA}
              onClick={onConfigureBlocklist}
              data-action="configure-blocklist"
            >
              {NB_TRUST_CTA}
            </button>
          </div>
        </main>
      </div>
    </section>
  );
}
