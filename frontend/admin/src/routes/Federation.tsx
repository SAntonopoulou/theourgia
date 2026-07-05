/**
 * Federation admin — peer browser (self-host ops).
 *
 * Port of ``Theourgia Federation.dc.html`` per the per-component ritual.
 * From `agent_onboarding.md §` Theourgia Federation:
 *   · This-instance card with federation-mode toggle (open/invite/off +
 *     live note).
 *   · Pending peer request.
 *   · Connected-peers list: status dot+glow, trust badge, software,
 *     shared scope, latency, blocked peer.
 *   · At-a-glance stats + a "what you share" rail → SSO.
 *   · "Status" = real connectivity (live probe). Blocking is a real
 *     policy change (Confirm).
 *
 * Per `feedback_follow_design_thread_deep.md` — same live-data pattern
 * as Health: peer rows carry ``data-probe-pending`` so the live-probe
 * substrate can swap the latency / reachability values for real
 * results. Block / unblock actions are stubbed to themed Confirms.
 *
 * Demo this-instance hostname swapped from "vault.sophia.name" to
 * "vault.demo.theourgia.net" per the magickal-name rule.
 */

import { ConfirmDialog, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

type Mode = "open" | "invite" | "off";

interface Peer {
  id: string;
  domain: string;
  trust: "Trusted" | "Probationary";
  software: string;
  shared: string;
  sync: string;
  status: "Reachable" | "Degraded" | "Unreachable";
  latency: string;
}

const MODE_NOTE: Record<Mode, string> = {
  open: "Open — any verified Theourgia instance may request to peer. Requests still need your acceptance.",
  invite: "Invite — only instances you add, or that a current peer vouches for, may connect.",
  off: "Off — your vault is private. No federation; network rites and shared notices are disabled.",
};

// Backend federation-peer probe endpoint not yet built. Empty until
// /api/v1/federation/peers ships; render an honest empty state
// instead of fabricated peer latencies.
const PEERS: Peer[] = [];

function statusColor(s: Peer["status"]): string {
  if (s === "Reachable") return "var(--success)";
  if (s === "Degraded") return "var(--warning)";
  return "var(--ink-mute)";
}

function trustColor(t: Peer["trust"]): string {
  return t === "Trusted" ? "var(--success)" : "var(--warning)";
}

function ModeButton({ active, onClick, label }: { value: Mode; active: boolean; onClick: () => void; label: string }) {
  const base: CSSProperties = {
    padding: "4px 11px",
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    color: active ? "var(--ink)" : "var(--ink-mute)",
    background: active ? "var(--accent-soft)" : "transparent",
    border: `1px solid ${active ? LINE_2 : "transparent"}`,
    borderRadius: 6,
    transition: "all 0.15s ease",
    cursor: "pointer",
  };
  return (
    <button type="button" data-fmode aria-pressed={active ? "true" : "false"} onClick={onClick} style={base}>
      {label}
    </button>
  );
}

function PeerRow({ peer, last, onAction }: { peer: Peer; last: boolean; onAction: () => void }) {
  const dot = statusColor(peer.status);
  return (
    <div
      data-probe-pending="true"
      data-probe-id={peer.id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 15,
        padding: "16px 20px",
        borderBottom: last ? "none" : `1px solid ${LINE}`,
        transition: "background-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: dot,
          flex: "none",
          boxShadow: `0 0 0 4px color-mix(in srgb, ${dot} 18%, transparent)`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ink)" }}>{peer.domain}</span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: trustColor(peer.trust),
              padding: "1px 8px",
              border: `1px solid ${LINE}`,
              borderRadius: 999,
            }}
          >
            {peer.trust}
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginTop: 4 }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>{peer.software}</span>
          <span>{peer.shared}</span>
          <span>{peer.sync}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: statusColor(peer.status) }}>{peer.status}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>{peer.latency}</div>
      </div>
      <button
        type="button"
        onClick={onAction}
        aria-label={`Manage ${peer.domain}`}
        style={{
          width: 32,
          height: 32,
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-sm)",
          color: "var(--ink-mute)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          background: "transparent",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  );
}

export function Federation() {
  const [mode, setMode] = useState<Mode>("invite");
  const [peerTarget, setPeerTarget] = useState<Peer | null>(null);
  const [unblockOpen, setUnblockOpen] = useState(false);

  useTopbar(
    () => ({
      title: "Federation",
      subtitle: "Settings · Self-host",
      after: (
        <button
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13.5,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add peer
        </button>
      ),
    }),
    [],
  );

  const hasPending = mode !== "off";

  return (
    <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 26 }}>

        {/* LEFT */}
        <div style={{ flex: "2 1 500px", minWidth: 0 }}>

          {/* this instance */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: `1px solid ${LINE_2}`,
              borderRadius: "var(--r-lg)",
              background: "var(--bg-2)",
              padding: "18px 20px",
              marginBottom: 26,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                border: `1px solid ${LINE_2}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flex: "none",
              }}
              aria-hidden="true"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
              </svg>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, lineHeight: 1.1 }}>vault.demo.theourgia.net</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)", marginTop: 3 }}>
                Theourgia v1.4 · ed25519 7C19·A4F0
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)" }}>Federation</span>
              <div
                role="group"
                aria-label="Federation mode"
                style={{
                  display: "flex",
                  gap: 2,
                  padding: 3,
                  border: `1px solid ${LINE}`,
                  borderRadius: 8,
                  background: "var(--bg)",
                }}
              >
                <ModeButton value="open" active={mode === "open"} onClick={() => setMode("open")} label="Open" />
                <ModeButton value="invite" active={mode === "invite"} onClick={() => setMode("invite")} label="Invite" />
                <ModeButton value="off" active={mode === "off"} onClick={() => setMode("off")} label="Off" />
              </div>
            </div>
          </div>

          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", margin: "0 0 16px" }}>{MODE_NOTE[mode]}</p>

          {/* pending */}
          {hasPending ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: "1px solid var(--warning)",
                borderRadius: "var(--r-md)",
                background: "color-mix(in srgb, var(--warning) 8%, transparent)",
                padding: "14px 18px",
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: `1px solid ${LINE_2}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  color: "var(--ink-soft)",
                  fontSize: 16,
                  flex: "none",
                }}
                aria-hidden="true"
              >
                S
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>scriptorium.adeptus.org</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
                  requests to peer · Theourgia v1.4 · signed
                </div>
              </div>
              <button
                type="button"
                style={{
                  padding: "7px 14px",
                  borderRadius: "var(--r-sm)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                }}
              >
                Decline
              </button>
              <button
                type="button"
                style={{
                  padding: "7px 15px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontFamily: "var(--font-ui)",
                  fontWeight: 700,
                  fontSize: 12.5,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                }}
              >
                Review & accept
              </button>
            </div>
          ) : null}

          {/* peers */}
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 12 }}>
            Connected peers · {PEERS.length}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-lg)",
              overflow: "hidden",
              background: "var(--bg-2)",
            }}
          >
            {PEERS.map((p) => (
              <PeerRow key={p.id} peer={p} last={false} onAction={() => setPeerTarget(p)} />
            ))}

            {/* blocked peer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                padding: "14px 20px",
                opacity: 0.72,
                flexWrap: "wrap",
              }}
            >
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--danger)", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 14.5, color: "var(--ink-soft)" }}>node.blacklodge.onion</span>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--danger)",
                      padding: "1px 8px",
                      border: `1px solid ${LINE}`,
                      borderRadius: 999,
                    }}
                  >
                    Blocked
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginTop: 4 }}>
                  Refused at the gate · unsigned notices
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnblockOpen(true)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  flex: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-mute)";
                }}
              >
                Unblock
              </button>
            </div>
          </div>

          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
              fontStyle: "italic",
              margin: "22px 0 0",
              maxWidth: "60ch",
            }}
          >
            Latency + reachability shown are placeholder values — live probes wire up with the federation substrate.
          </p>
        </div>

        {/* RIGHT */}
        <aside style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 13 }}>
              At a glance
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {[
                { label: "Peers reachable", value: "3 / 4", color: "var(--success)" },
                { label: "Shared rites this week", value: "11", color: "var(--ink)" },
                { label: "Inbound notices", value: "62", color: "var(--ink)" },
                { label: "Last federation sync", value: "2 min ago", color: "var(--ink-mute)", small: true },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>{row.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: row.small ? 12 : 13, color: row.color }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "18px 20px" }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 11 }}>
              What you share with peers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Public profile & lineage", on: true },
                { label: "Network ritual RSVPs", on: true },
                { label: "Private journal & workings", on: false },
                { label: "Identities you didn't publish", on: false },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={row.on ? "var(--success)" : "var(--ink-mute)"} strokeWidth={row.on ? "1.7" : "1.6"} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
                    {row.on ? <path d="M5 12.5l4.5 4.5L19 6.5" /> : <path d="M6 6l12 12M18 6 6 18" />}
                  </svg>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: row.on ? "var(--ink-soft)" : "var(--ink-mute)" }}>
                    {row.label}
                  </span>
                </div>
              ))}
            </div>
            <a
              href="/sso"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: "var(--accent)",
                marginTop: 13,
                textDecoration: "none",
                transition: "gap 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.gap = "10px";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.gap = "6px";
              }}
            >
              Per-hub sharing →
            </a>
          </div>

          <div style={{ background: "var(--bg-2)", border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none", marginTop: 1 }} aria-hidden="true">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
              </svg>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
                Every peer is verified by key before a single notice is exchanged. An unsigned instance never reaches your vault.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={peerTarget !== null}
        title={`Manage ${peerTarget?.domain ?? "peer"}`}
        body="The full management surface (trust changes, scope edits, block) lands with the federation substrate. For now this confirms the affordance is here."
        confirmLabel="Got it"
        cancelLabel="Close"
        tone="neutral"
        onConfirm={() => setPeerTarget(null)}
        onCancel={() => setPeerTarget(null)}
      />

      <ConfirmDialog
        open={unblockOpen}
        title="Unblock node.blacklodge.onion?"
        body="Future notices from this peer will be checked again, and accepted only if signed. You can re-block at any time."
        confirmLabel="Unblock"
        cancelLabel="Keep blocked"
        tone="constructive"
        onConfirm={() => setUnblockOpen(false)}
        onCancel={() => setUnblockOpen(false)}
      />
    </main>
  );
}
