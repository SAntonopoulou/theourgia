/**
 * Lineage admin — owner's view of their lineage attestations.
 *
 * The visitor read view ships in the public site (Batch 14
 * ``/lineage``). This admin variant lets the *owner* declare a new
 * attestation (signs with their identity's keypair) and relinquish an
 * existing one (signs a revocation).
 *
 * Per the per-component ritual:
 *   · `Theourgia Lineage.dc.html` is the single design source for both
 *     read and write views — same card layout, same state-color story
 *     (verified / self-declared / revoked). The admin variant adds an
 *     action footer per card + a topbar declare button.
 *   · `agent_onboarding.md §` Theourgia Lineage:
 *     - "verified / self-declared / revoked" states are real signature
 *       checks (§10.5).
 *     - State: Verify a signature, follow to an authority's profile,
 *       **declare/relinquish an attestation (signs/revokes)**.
 *     - Gotcha: states are derived from crypto, never set by hand.
 *
 * Declare / relinquish actions are stubbed until the §10.5 keypair
 * signing API ships — same pattern as Profile's verify-signature stub.
 */

import { ConfirmDialog, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

import { apiClient } from "../data/api.js";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

interface WireAttestation {
  id: string;
  kind: string;
  description: string;
  tradition: string | null;
  grade_or_degree: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  signatures: Array<{
    signer_label: string;
    role: string;
  }>;
}

function wireToAttestation(w: WireAttestation): Attestation {
  const counter = w.signatures.find((s) => s.role === "counter-sign");
  const revoked = w.revoked_at !== null;
  const state: AttestationState = revoked
    ? "revoked"
    : counter
      ? "verified"
      : "self-declared";
  const year = (() => {
    const iso = w.granted_at ?? null;
    if (!iso) return "—";
    const y = new Date(iso).getFullYear();
    return Number.isFinite(y) ? String(y) : "—";
  })();
  return {
    id: w.id,
    state,
    kindLabel: w.kind.replace(/_/g, " "),
    title: w.grade_or_degree || w.description.slice(0, 80),
    authority: w.tradition ?? counter?.signer_label ?? "—",
    counterSigner: counter?.signer_label,
    keyDigest: w.id.slice(0, 8),
    year,
    relinquishable: state === "self-declared",
  };
}

type AttestationState = "verified" | "self-declared" | "revoked";

interface Attestation {
  id: string;
  state: AttestationState;
  kindLabel: string;
  title: string;
  authority: string;
  counterSigner?: string;
  counterSignerHref?: string;
  keyDigest: string;
  year: string;
  /** Local attestations the owner can relinquish. Counter-signed by an
   *  authority you can't unilaterally revoke; only self-declared ones
   *  are relinquishable. */
  relinquishable: boolean;
}

// Fetched live on mount via ``useEffect`` below. Declared as an empty
// placeholder here so the initial render has stable identity.
const ATTESTATIONS_INITIAL: Attestation[] = [];

function stateTone(s: AttestationState): { color: string; border: string; label: string } {
  if (s === "verified") return { color: "var(--success)", border: "var(--success)", label: "Verified" };
  if (s === "revoked") return { color: "var(--danger)", border: "var(--danger)", label: "Revoked" };
  return { color: "var(--ink-mute)", border: LINE_2, label: "Self-declared" };
}

function StateIcon({ state }: { state: AttestationState }) {
  if (state === "verified") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2l7 3v6c0 5-3 8-7 11-4-3-7-6-7-11V5z" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === "revoked") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

function ActionLink({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: hover ? (danger ? "var(--danger)" : "var(--ink)") : "var(--ink-mute)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textDecoration: hover ? "underline" : "none",
  };
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={style}>
      {children}
    </button>
  );
}

export function LineageAdmin() {
  const [declareOpen, setDeclareOpen] = useState(false);
  const [relinquishTarget, setRelinquishTarget] = useState<Attestation | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>(ATTESTATIONS_INITIAL);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .request<WireAttestation[]>("/api/v1/attestations")
      .then((rows) => {
        if (!cancelled) setAttestations(rows.map(wireToAttestation));
      })
      .catch(() => {
        // Best-effort — empty state is fine.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useTopbar(
    () => ({
      title: "Lineage",
      subtitle: "Your attestations — declare, counter-sign, relinquish",
      after: (
        <button
          type="button"
          onClick={() => setDeclareOpen(true)}
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
          Declare attestation
        </button>
      ),
    }),
    [],
  );

  return (
    <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "24px 28px 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--ink-soft)",
            margin: "0 0 24px",
            maxWidth: "62ch",
          }}
        >
          Each attestation is signed by your identity's keypair; verified ones are also counter-signed by the granting
          authority. The chain is auditable end-to-end — visitors verify it in-browser against the authority's
          published key.
        </p>

        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 16 }}>
          Your attestations
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {attestations.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--line)",
                borderRadius: "var(--r-lg)",
                padding: "24px 22px",
                fontFamily: "var(--font-serif)",
                fontSize: 14,
                color: "var(--ink-mute)",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              No attestations on file. Declaring one requires the §10.5
              keypair signing endpoint (not yet wired end-to-end).
            </div>
          ) : null}
          {attestations.map((a) => {
            const tone = stateTone(a.state);
            return (
              <div
                key={a.id}
                style={{
                  border: `1px solid ${LINE}`,
                  borderRadius: "var(--r-lg)",
                  background: "var(--bg-2)",
                  padding: "20px 22px",
                  opacity: a.state === "revoked" ? 0.72 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 5 }}>
                      {a.kindLabel}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 21,
                        lineHeight: 1.2,
                        textDecoration: a.state === "revoked" ? "line-through" : "none",
                        textDecorationColor: a.state === "revoked" ? "var(--danger)" : undefined,
                      }}
                    >
                      {a.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink-soft)", marginTop: 3 }}>{a.authority}</div>
                  </div>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                      color: tone.color,
                      border: `1px solid ${tone.border}`,
                      borderRadius: 999,
                      padding: "5px 11px",
                      flex: "none",
                    }}
                  >
                    <StateIcon state={a.state} />
                    {tone.label}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${LINE}`, paddingTop: 13 }}>
                  {a.counterSigner && a.state === "verified" ? (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
                      Counter-signed by{" "}
                      <a href={a.counterSignerHref ?? "#"} style={{ color: "var(--accent)", textDecoration: "none" }}>
                        {a.counterSigner}
                      </a>
                    </span>
                  ) : a.state === "self-declared" ? (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
                      Signed by you · not yet counter-signed by an authority
                    </span>
                  ) : (
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)" }}>
                      Revocation counter-signed by the granting body · {a.year}
                    </span>
                  )}
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-mute)", marginLeft: "auto" }}>{a.keyDigest}</span>
                  {a.relinquishable ? (
                    <ActionLink danger onClick={() => setRelinquishTarget(a)}>
                      Relinquish
                    </ActionLink>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-mute)", margin: "26px 0 0", maxWidth: "62ch" }}>
          Declaring signs the claim with your identity's keypair. Relinquishing signs a revocation against your own
          signature; counter-signed degrees additionally require the granting authority's signature to fully revoke —
          relinquish from your side only removes your assent.
        </p>
      </div>

      <ConfirmDialog
        open={declareOpen}
        title="Declare a new attestation?"
        body="A declaration is a signed claim. It will appear as self-declared until an authority counter-signs it. Real signing wires up with the §10.5 keypair endpoint; this declare flow is currently a stub."
        confirmLabel="Open declare form"
        cancelLabel="Cancel"
        tone="constructive"
        onConfirm={() => setDeclareOpen(false)}
        onCancel={() => setDeclareOpen(false)}
      />

      <ConfirmDialog
        open={relinquishTarget !== null}
        title={`Relinquish "${relinquishTarget?.title ?? ""}"?`}
        body="Your signature on this attestation will be revoked. Counter-signed degrees additionally require the granting authority's revocation to fully clear; relinquishing from your side removes your assent."
        confirmLabel="Relinquish"
        cancelLabel="Keep"
        tone="destructive"
        onConfirm={() => setRelinquishTarget(null)}
        onCancel={() => setRelinquishTarget(null)}
      />
    </main>
  );
}
