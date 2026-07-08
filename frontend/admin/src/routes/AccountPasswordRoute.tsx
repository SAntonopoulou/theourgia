/**
 * Account password settings — b108-2hl.
 *
 * SECURITY: closes the hole where anyone who knew the magickal name
 * could sign in as the vault owner. This surface lets the operator
 * SET (first time) or CHANGE their password.
 *
 * The signed-in endpoint uses the Argon2id password_hash column
 * that has always been on the User model. Before b108-2hl the
 * demo-signin path never checked it — that's the fix.
 */

import { useAuth, useTopbar } from "@theourgia/shared";
import { type CSSProperties, useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

export function AccountPasswordRoute() {
  useTopbar(
    () => ({
      title: "Account password",
      subtitle:
        "The password required to sign in with your magickal name.",
    }),
    [],
  );

  const auth = useAuth();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [current, setCurrent] = useState<string>("");
  const [next, setNext] = useState<string>("");
  const [confirmValue, setConfirmValue] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await apiMethods.getPasswordStatus();
      setHasPassword(s.has_password);
    } catch (e) {
      setMessage({
        tone: "error",
        text: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    void loadStatus();
  }, [auth.status, loadStatus]);

  const submit = async () => {
    setMessage(null);
    if (next.length < 8) {
      setMessage({
        tone: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (next !== confirmValue) {
      setMessage({ tone: "error", text: "New password + confirmation must match." });
      return;
    }
    setBusy(true);
    try {
      await apiMethods.setPassword({
        new_password: next,
        current_password: hasPassword ? current : null,
      });
      setHasPassword(true);
      setCurrent("");
      setNext("");
      setConfirmValue("");
      setMessage({
        tone: "ok",
        text:
          "Password saved. Next time you sign in, enter this password after"
          + " your magickal name.",
      });
    } catch (e) {
      setMessage({
        tone: "error",
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  if (auth.status !== "authenticated" || hasPassword === null) {
    return <div style={{ padding: "var(--space-4)" }}>Loading…</div>;
  }

  return (
    <div style={pageStyle} data-route="account-password">
      <div style={cardStyle}>
        {!hasPassword && (
          <div
            role="alert"
            style={{
              padding: "var(--space-3)",
              marginBottom: "var(--space-4)",
              background: "var(--care-bg, var(--bg-2))",
              border: "1px solid var(--care)",
              borderRadius: "var(--r-md)",
              color: "var(--care)",
            }}
          >
            <strong>Set a password now.</strong> Until you do, anyone who
            types your magickal name at the sign-in surface can open this
            vault. The password becomes your credential for every future
            sign-in.
          </div>
        )}

        {hasPassword && (
          <label style={labelStyle}>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              style={inputStyle}
            />
          </label>
        )}
        <label style={labelStyle}>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            style={inputStyle}
          />
          <span style={hintStyle}>At least 8 characters.</span>
        </label>
        <label style={labelStyle}>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            style={inputStyle}
          />
        </label>

        {message && (
          <p
            role="alert"
            style={{
              color:
                message.tone === "error" ? "var(--care)" : "var(--accent)",
              marginBottom: "var(--space-2)",
            }}
          >
            {message.text}
          </p>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || next.length < 8 || next !== confirmValue}
          style={{
            ...primaryButton,
            opacity:
              busy || next.length < 8 || next !== confirmValue ? 0.6 : 1,
            cursor:
              busy || next.length < 8 || next !== confirmValue
                ? "not-allowed"
                : "pointer",
          }}
        >
          {busy
            ? "Saving…"
            : hasPassword
              ? "Change password"
              : "Set password"}
        </button>
      </div>
    </div>
  );
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

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "var(--space-3)",
  font: "var(--type-label)",
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--space-2)",
  marginTop: 4,
  marginBottom: 4,
  background: "var(--bg)",
  color: "var(--ink)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-md)",
};

const hintStyle: CSSProperties = {
  display: "block",
  font: "var(--type-caption)",
  color: "var(--muted)",
};

const primaryButton: CSSProperties = {
  padding: "var(--space-2) var(--space-3)",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
  font: "var(--type-label)",
};
