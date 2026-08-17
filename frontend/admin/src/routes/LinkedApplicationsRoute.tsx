/**
 * Linked applications — where a companion app's link code is minted.
 *
 * Nobody's theourgia password is ever typed anywhere but here: an embedded
 * login form in another app is the exact habit every phishing attack relies
 * on, and a full OAuth implementation is a cost neither side has paid. So
 * this surface shows eight characters, and the user types them into the
 * companion. What the companion gets depends on which kind it is:
 *
 * - **The Theourgia app** (the phone) redeems the code itself and receives a
 *   session of its own — it acts as you, which is what sync *is* — and the
 *   session appears in your active sessions under the device's name,
 *   revocable like any other.
 * - **astropractise** has its own accounts; its SERVER redeems the code with
 *   client credentials and learns only "this is user X here". No session.
 *
 * See `theourgia/models/link_code.py` for the whole mechanism.
 *
 * Mounted at /settings/linked-applications.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, type ReactNode, useState } from "react";
import QRCode from "react-qr-code";

import { ApiError, apiPost } from "../lib/api.js";

/** Kept in step with the instance's configured audiences: device audiences
 * (`THEOURGIA_DEVICE_LINK_AUDIENCES`) and relying-party clients
 * (`THEOURGIA_LINK_CODE_CLIENTS`). */
const COMPANIONS: Array<{
  audience: string;
  title: string;
  instructions: ReactNode;
  receives: string;
  /** Whether the companion can take the code by camera. The QR encodes a
   * `theourgia://link?server=…&code=…` URI so a self-hosted instance's
   * address travels with its code; typing stays the fallback always. */
  scannable?: boolean;
}> = [
  {
    audience: "theourgia-app",
    title: "Theourgia — the app",
    scannable: true,
    instructions: (
      <>
        Ask for a code here, then type it into the Theourgia app under
        <em> Settings → Link this account</em>. The code lasts ten minutes and works once.
      </>
    ),
    receives:
      "The app receives a signed-in session of its own — that is what keeps " +
      "your record in step. It appears in your active sessions under the " +
      "device's name, and revoking it there unlinks the device.",
  },
  {
    audience: "astropractise",
    title: "astropractise",
    instructions: (
      <>
        Ask for a code here, then type it into the astropractise app under
        <em> Me → Your page → Link my theourgia account</em>. The code lasts ten minutes and works
        once.
      </>
    ),
    receives:
      "astropractise learns your account id and the display name on your " +
      "default persona. Not your email, not your vault, and no session — " +
      "redeeming its code opens no way to act as you here.",
  },
];

type MintedCode = {
  code: string;
  audience: string;
  expires_at_utc: string;
};

export function LinkedApplicationsRoute() {
  useTopbar(
    () => ({
      title: "Linked applications",
      subtitle: "Connect a companion app to this account",
    }),
    [],
  );

  return (
    <div style={pageStyle} data-route="linked-applications">
      {COMPANIONS.map((companion) => (
        <CompanionCard key={companion.audience} {...companion} />
      ))}

      <div style={{ ...cardStyle, marginTop: "var(--space-4)" }}>
        <h3 style={{ font: "var(--type-h4)", marginTop: 0 }}>What a code is worth</h3>
        <p style={proseStyle}>
          A code is worth nothing on its own until the right application spends it — and each card
          above says exactly what that application receives. Read one aloud to the wrong person and
          the worst they can do is link an account you were about to link anyway; asking for a new
          code cancels the old one at once.
        </p>
      </div>
    </div>
  );
}

function CompanionCard({
  audience,
  title,
  instructions,
  receives,
  scannable = false,
}: {
  audience: string;
  title: string;
  instructions: ReactNode;
  receives: string;
  scannable?: boolean;
}) {
  const [code, setCode] = useState<MintedCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mint = async () => {
    setBusy(true);
    setError(null);
    try {
      setCode(await apiPost<MintedCode>("/link-codes", { audience }));
    } catch (e) {
      // A 503 means the operator has not configured any companion
      // application; a 404 means not THIS one. Deployment facts, not the
      // user's mistake.
      setError(
        e instanceof ApiError && e.status === 503
          ? "No companion applications are configured on this instance."
          : e instanceof ApiError && e.status === 404
            ? "This companion is not configured on this instance."
            : e instanceof Error
              ? e.message
              : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...cardStyle, marginBottom: "var(--space-4)" }} data-audience={audience}>
      <h2 style={{ font: "var(--type-h3)", marginTop: 0 }}>{title}</h2>
      <p style={proseStyle}>{instructions}</p>

      {code ? (
        <>
          {scannable ? (
            <div style={qrWrapStyle} data-testid="link-qr">
              <QRCode
                value={linkUri(code.code)}
                size={168}
                bgColor="transparent"
                fgColor="currentColor"
                aria-label="Scan this code with the Theourgia app"
              />
            </div>
          ) : null}
          <p style={codeStyle}>{format(code.code)}</p>
          <p style={hintStyle}>
            {scannable ? "Scan it, or type it. " : ""}Expires {new Date(code.expires_at_utc).toLocaleTimeString()}. Asking for another one
            immediately cancels this.
          </p>
        </>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "var(--care)" }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void mint()}
        disabled={busy}
        style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "Working…" : code ? "Give me a new code" : "Show me a code"}
      </button>

      <p style={{ ...hintStyle, textAlign: "left", marginTop: "var(--space-3)" }}>{receives}</p>
    </div>
  );
}

/** The URI a scanned code carries: which instance, and the code itself —
 * so a self-hosted vault's QR links the phone to that vault, not to
 * theourgia.com. */
function linkUri(code: string): string {
  return `theourgia://link?server=${encodeURIComponent(window.location.origin)}&code=${encodeURIComponent(code)}`;
}

/** Four and four. Eight unbroken characters is harder to read back. */
function format(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

const pageStyle: CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: "var(--space-4)",
};

const cardStyle: CSSProperties = {
  padding: "var(--space-4)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
};

const proseStyle: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--ink)",
  lineHeight: 1.6,
};

const qrWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "var(--space-3)",
  margin: "var(--space-3) 0 0",
  color: "var(--ink)",
};

const codeStyle: CSSProperties = {
  font: "var(--type-mono, monospace)",
  fontSize: "2rem",
  letterSpacing: "0.15em",
  textAlign: "center",
  padding: "var(--space-3)",
  margin: "var(--space-3) 0 var(--space-1)",
  background: "var(--bg)",
  border: "1px solid var(--accent)",
  borderRadius: "var(--r-md)",
  color: "var(--ink)",
  userSelect: "all",
};

const hintStyle: CSSProperties = {
  font: "var(--type-caption)",
  color: "var(--muted)",
  textAlign: "center",
  marginTop: 0,
};

const primaryButton: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  marginTop: "var(--space-3)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
  font: "var(--type-label)",
};
