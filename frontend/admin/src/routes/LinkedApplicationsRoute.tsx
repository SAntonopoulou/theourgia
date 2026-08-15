/**
 * Linked applications — where a companion app's link code is minted.
 *
 * The first companion is **astropractise**, whose app cannot hold a theourgia
 * session token: getting one onto a phone means either an embedded login form
 * — asking somebody to type their theourgia password into a different app,
 * which is the exact habit every phishing attack relies on — or a full OAuth
 * implementation neither side has.
 *
 * So this surface shows eight characters. The user types them into the app;
 * the app's SERVER redeems them here with its own client credentials. See
 * `theourgia/models/link_code.py` for the whole mechanism.
 *
 * Mounted at /settings/linked-applications.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useState } from "react";

import { ApiError, apiPost } from "../lib/api.js";

/** Kept in step with the mint endpoint's own list of configured clients. */
const AUDIENCE = "astropractise";

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

  const [code, setCode] = useState<MintedCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mint = async () => {
    setBusy(true);
    setError(null);
    try {
      setCode(await apiPost<MintedCode>("/link-codes", { audience: AUDIENCE }));
    } catch (e) {
      // A 503 here means the operator has not configured any companion
      // application, which is a deployment fact and not the user's mistake.
      setError(
        e instanceof ApiError && e.status === 503
          ? "No companion applications are configured on this instance."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={pageStyle} data-route="linked-applications">
      <div style={cardStyle}>
        <h2 style={{ font: "var(--type-h3)", marginTop: 0 }}>astropractise</h2>
        <p style={proseStyle}>
          Ask for a code here, then type it into the astropractise app under
          <em> Me → Your page → Link my theourgia account</em>. The code lasts ten minutes and works
          once.
        </p>

        {code ? (
          <>
            <p style={codeStyle}>{format(code.code)}</p>
            <p style={hintStyle}>
              Expires {new Date(code.expires_at_utc).toLocaleTimeString()}. Asking for another one
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
      </div>

      <div style={{ ...cardStyle, marginTop: "var(--space-4)" }}>
        <h3 style={{ font: "var(--type-h4)", marginTop: 0 }}>What the other application learns</h3>
        <p style={proseStyle}>
          Your account id and the display name on your default persona. Not your email, not your
          vault, and not the ability to act as you here. Redeeming a code opens no session on this
          instance.
        </p>
        <p style={proseStyle}>
          A code is worth nothing on its own — the application redeeming it has to hold credentials
          this instance's operator gave it. Read one aloud to the wrong person and the worst they
          can do is link an account you were about to link anyway.
        </p>
      </div>
    </div>
  );
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
