/**
 * SignIn — proper primary auth entry.
 *
 * Replaces the developer-diagnostic /connection surface as the public
 * signin landing page. Composes:
 *
 *   · Passkey primary CTA — one-click WebAuthn assertion
 *   · Demo signin fallback — Phase-02 magickal-name form
 *   · Post-sign-in TOTP challenge (rendered inline when the user has
 *     enrolled TOTP; the session stays "pre-2FA" until code is verified)
 *
 * On successful sign-in the surface redirects to `/` (Today).
 */

import {
  isWebauthnSupported,
  useAuth,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const PAGE: CSSProperties = {
  maxWidth: 460,
  margin: "0 auto",
  padding: "84px 24px 56px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  alignItems: "center",
  textAlign: "center",
};

const CARD: CSSProperties = {
  width: "100%",
  padding: "28px 26px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const PRIMARY_BUTTON: CSSProperties = {
  padding: "12px 20px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--accent)",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 14.5,
  fontWeight: 600,
  cursor: "pointer",
};

const QUIET_BUTTON: CSSProperties = {
  padding: "10px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "transparent",
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  cursor: "pointer",
};

const INPUT: CSSProperties = {
  padding: "10px 14px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--font-serif)",
  fontSize: 15,
  width: "100%",
  boxSizing: "border-box" as const,
};

export function SignInRoute() {
  useTopbar(() => ({
    title: "Sign in or create your vault",
    subtitle: "θεουργία — the working of divine things",
  }));

  const auth = useAuth();
  const navigate = useNavigate();
  const supported = isWebauthnSupported();

  // Magickal-name sign-in is the primary path for operators without
  // hardware WebAuthn: pair it with TOTP 2FA at /settings/totp and the
  // security model is (something-they-typed) + (something-their-phone-has).
  // Always shown; the passkey button above is still there for operators
  // with hardware keys.
  const magickalNameEnabled = true;

  const [showDemo, setShowDemo] = useState(false);
  const [magickalName, setMagickalName] = useState("");
  const [showTotp, setShowTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totpStatusQuery = useQuery({
    queryKey: ["totp-status"],
    queryFn: async () => apiMethods.totpStatus(),
    enabled: auth.status === "authenticated",
    staleTime: 60_000,
  });

  const passkeyMutation = useMutation({
    mutationFn: async () => auth.signInWebAuthn(),
    onSuccess: async () => {
      setError(null);
      const status = await apiMethods.totpStatus();
      if (status.enrolled) {
        setShowTotp(true);
      } else {
        navigate("/");
      }
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  const demoMutation = useMutation({
    mutationFn: async (name: string) =>
      apiMethods.demoSignIn({ magickal_name: name }),
    onSuccess: async () => {
      setError(null);
      await auth.refresh();
      const status = await apiMethods.totpStatus();
      if (status.enrolled) {
        setShowTotp(true);
      } else {
        navigate("/");
      }
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  const totpMutation = useMutation({
    mutationFn: async (code: string) => apiMethods.totpChallenge({ code }),
    onSuccess: () => {
      setError(null);
      navigate("/");
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
    },
  });

  // If already authenticated + no TOTP challenge pending, go home.
  if (
    auth.status === "authenticated" &&
    !showTotp &&
    !totpMutation.isPending &&
    !totpStatusQuery.isPending &&
    !totpStatusQuery.data?.enrolled
  ) {
    navigate("/", { replace: true });
    return null;
  }

  if (showTotp) {
    return (
      <div style={PAGE}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            Second factor
          </div>
          <div
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink-soft)",
            }}
          >
            Enter the 6-digit code from your authenticator (or a backup
            code if you've lost the app).
          </div>
        </div>
        <div style={CARD}>
          <input
            style={INPUT}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoFocus
            aria-label="Verification code"
          />
          <button
            type="button"
            style={PRIMARY_BUTTON}
            disabled={totpMutation.isPending || !totpCode.trim()}
            onClick={() => totpMutation.mutate(totpCode.trim())}
          >
            {totpMutation.isPending ? "Verifying…" : "Verify"}
          </button>
          {error ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--warn)",
              }}
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={PAGE}>
      <div>
        <svg
          width="56"
          height="56"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
          style={{ display: "block", margin: "0 auto 12px" }}
        >
          <circle cx="20" cy="20" r="17.5" stroke="var(--accent)" strokeWidth="1.4" />
          <circle cx="20" cy="20" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.55" />
          <line x1="9.5" y1="20" x2="30.5" y2="20" stroke="var(--accent)" strokeWidth="1.4" />
        </svg>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            color: "var(--ink)",
            marginBottom: 6,
          }}
        >
          Enter or open the vault
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--accent)",
            marginBottom: 12,
          }}
        >
          <span lang="el" style={{ fontFamily: "var(--font-greek, var(--font-serif))" }}>
            θεουργία
          </span>{" "}
          — the working of divine things
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
            maxWidth: 42 * 8,
          }}
        >
          If your magickal name is already in this vault, you'll sign in.
          If it isn't, this creates the vault under that name. Add a second
          factor at <em>Settings → Two-factor codes</em> once you're in.
        </div>
      </div>

      <div style={CARD}>
        <button
          type="button"
          style={PRIMARY_BUTTON}
          disabled={!supported || passkeyMutation.isPending}
          onClick={() => passkeyMutation.mutate()}
        >
          {passkeyMutation.isPending
            ? "Follow your device's prompt…"
            : "Sign in with passkey"}
        </button>
        {!supported ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            WebAuthn is not available in this browser. Try Chrome, Safari,
            Firefox, or Edge over HTTPS.
          </div>
        ) : null}
        {magickalNameEnabled ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}
              >
                or
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            {showDemo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  style={INPUT}
                  value={magickalName}
                  onChange={(e) => setMagickalName(e.target.value)}
                  placeholder="Your magickal name"
                  autoFocus
                  aria-label="Magickal name"
                />
                <button
                  type="button"
                  style={PRIMARY_BUTTON}
                  disabled={demoMutation.isPending || !magickalName.trim()}
                  onClick={() => demoMutation.mutate(magickalName.trim())}
                >
                  {demoMutation.isPending ? "Signing in…" : "Continue"}
                </button>
                <button
                  type="button"
                  style={QUIET_BUTTON}
                  onClick={() => setShowDemo(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                style={QUIET_BUTTON}
                onClick={() => setShowDemo(true)}
              >
                Continue with magickal name
              </button>
            )}
          </>
        ) : null}
        {error ? (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--warn)",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        First time here?{" "}
        <a
          href="/self-host"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Self-host guide
        </a>
      </div>
    </div>
  );
}
