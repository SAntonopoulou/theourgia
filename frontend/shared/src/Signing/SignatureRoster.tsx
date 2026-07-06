/**
 * SignatureRoster — display the chain of signatures on an attestation.
 *
 * Each row shows:
 *   • Role icon + label  (Self / Counter-sign / Revocation)
 *   • Signer's display name + key short  (4+4 hex; full key in title)
 *   • Signed-at timestamp
 *   • Verification pill (Verified / Does not verify / Revoked) —
 *     colour PLUS glyph; never colour alone.
 *   • If role === "revocation": the reason quoted below.
 *
 * Per H01-H03 supplement §S3.3: verification pills MUST pair colour
 * with a glyph, history is append-only (revocations are new rows,
 * never erasures), and roles get their own colour family
 * (self = accent, counter-sign = verify-green, revocation = revoke-slate).
 */

import { type CSSProperties, type ReactNode } from "react";

import { PublicKeyShort } from "./PublicKeyShort.js";

export type SignatureRole = "self" | "counter-sign" | "revocation";
export type VerifyStatus = "ok" | "fail" | "revoked";

export interface SignatureRow {
  /** Stable identifier (uuid / db id). */
  id: string;
  role: SignatureRole;
  /** Human label for the signer (a magickal name or role, e.g.
   *  a Sanctus Order motto or "Lodge Master"). */
  signerLabel: string;
  /** Hex public key (caller-provided; 64 chars for Ed25519). */
  signerPublicKey: string;
  /** Signed-at timestamp as already-formatted display string
   *  (the caller decides locale + format). */
  signedAt: string;
  /** Verification result from the backend. The pill is derived. */
  verify: VerifyStatus;
  /** If role === "revocation", the reason becomes part of the
   *  signed bytes and is quoted under the row. */
  reason?: string;
}

export interface SignatureRosterProps {
  signatures: readonly SignatureRow[];
  className?: string;
  style?: CSSProperties;
}

// ─── Glyphs (verbatim from Theourgia Attestations.dc.html) ───────────

function VerifyGlyph({ status }: { status: VerifyStatus }) {
  if (status === "ok") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12l4 4 10-10" />
      </svg>
    );
  }
  if (status === "fail") {
    return (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  // revoked
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function RoleGlyph({ role }: { role: SignatureRole }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": "true" as const,
  };
  if (role === "self") {
    return (
      <svg {...common}>
        <path d="M5 19l1-3 9-9 2 2-9 9z" />
        <path d="M14 8l2 2" />
      </svg>
    );
  }
  if (role === "counter-sign") {
    return (
      <svg {...common}>
        <path d="M16 11l2 2 4-4" />
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5.5 6-5.5" />
      </svg>
    );
  }
  // revocation
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

// ─── Role + verify meta ──────────────────────────────────────────────

interface RoleMeta {
  label: string;
  color: string;
}

const ROLE_META: Record<SignatureRole, RoleMeta> = {
  self: { label: "Self", color: "var(--accent)" },
  "counter-sign": { label: "Counter-sign", color: "var(--verify)" },
  revocation: { label: "Revocation", color: "var(--revoke)" },
};

interface VerifyMeta {
  label: string;
  color: string;
  soft: string;
}

const VERIFY_META: Record<VerifyStatus, VerifyMeta> = {
  ok: { label: "Verified", color: "var(--verify)", soft: "var(--verify-soft)" },
  fail: {
    label: "Does not verify",
    color: "var(--warn)",
    soft: "var(--warn-soft)",
  },
  revoked: {
    label: "Revoked",
    color: "var(--revoke)",
    soft: "var(--revoke-soft)",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export function SignatureRoster({
  signatures,
  className,
  style,
}: SignatureRosterProps) {
  return (
    <ul
      className={className}
      aria-label="Signatures"
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...style,
      }}
    >
      {signatures.map((sig) => {
        // Revocations always render with the "revoked" verify pill
        // regardless of the underlying check result (per Attestations
        // surface logic: a revocation row IS the revocation).
        const verify =
          sig.role === "revocation" ? "revoked" : sig.verify;
        return (
          <li key={sig.id}>
            <SignatureRosterCard {...sig} verify={verify} />
          </li>
        );
      })}
    </ul>
  );
}

function SignatureRosterCard({
  role,
  signerLabel,
  signerPublicKey,
  signedAt,
  verify,
  reason,
}: SignatureRow) {
  const roleMeta = ROLE_META[role];

  const cardStyle: CSSProperties = {
    border: `1px solid ${
      role === "revocation" ? "var(--line-2)" : "var(--line)"
    }`,
    borderRadius: "var(--r-md)",
    background:
      role === "revocation" ? "var(--revoke-soft)" : "var(--bg-2)",
    padding: "13px 15px",
  };

  return (
    <article style={cardStyle} data-role={role} data-verify={verify}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span
          style={{
            width: 34,
            height: 34,
            flex: "none",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: roleMeta.color,
            background: `color-mix(in srgb, ${roleMeta.color} 15%, transparent)`,
            border: "1px solid var(--line-2)",
          }}
        >
          <RoleGlyph role={role} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display, var(--font-serif))",
                fontSize: 16,
                color: "var(--ink)",
              }}
            >
              {signerLabel}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10.5,
                color: "var(--ink-mute)",
                padding: "1px 7px",
                border: "1px solid var(--line)",
                borderRadius: 999,
              }}
            >
              {roleMeta.label}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
            }}
          >
            <PublicKeyShort keyHex={signerPublicKey} />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-mute)",
              }}
            >
              · {signedAt}
            </span>
          </div>
        </div>
        <VerifyPill verify={verify} />
      </div>
      {role === "revocation" && reason ? (
        <ReasonQuote>{reason}</ReasonQuote>
      ) : null}
    </article>
  );
}

function VerifyPill({ verify }: { verify: VerifyStatus }) {
  const meta = VERIFY_META[verify];
  return (
    <span
      style={{
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font-ui)",
        fontSize: 11.5,
        color: meta.color,
        background: meta.soft,
        border: "1px solid var(--line-2)",
        borderRadius: 999,
        padding: "4px 10px",
      }}
      data-verify={verify}
      aria-label={meta.label}
    >
      <VerifyGlyph status={verify} />
      {/* thin space + label, matching the .dc.html source */}
      {" "}
      {meta.label}
    </span>
  );
}

function ReasonQuote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        borderLeftWidth: 2,
        borderLeftStyle: "solid",
        borderLeftColor: "var(--revoke)",
        background: "var(--bg-sunk)",
        borderTopRightRadius: 6,
        borderBottomRightRadius: 6,
        fontFamily: "var(--font-serif)",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "var(--ink-soft)",
      }}
    >
      {children}
    </div>
  );
}

export { ROLE_META, VERIFY_META };
