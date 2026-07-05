/**
 * TOTP enrolment — /app/settings/totp.
 *
 * Two-step enrolment:
 *   1. Begin — server issues secret + otpauth:// URI. Surface renders
 *      a scannable QR + the raw secret for manual entry.
 *   2. Verify — user submits the current 6-digit code; server confirms
 *      and returns 10 one-time backup codes (shown once, then hidden).
 *
 * When already enrolled: surface shows the enrolled state + a "Disable"
 * action + a "Regenerate backup codes" action.
 */

import { ConfirmDialog, useAuth, useTopbar } from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { apiMethods } from "../data/api.js";

const PAGE: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "26px 24px 48px",
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const CARD: CSSProperties = {
  padding: "22px 24px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const PRIMARY_BUTTON: CSSProperties = {
  padding: "10px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--accent)",
  borderRadius: "var(--r-md)",
  background: "var(--accent)",
  color: "var(--accent-ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

const QUIET_BUTTON: CSSProperties = {
  padding: "9px 16px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line-2)",
  borderRadius: "var(--r-md)",
  background: "transparent",
  color: "var(--ink)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
  cursor: "pointer",
};

const WARN_BUTTON: CSSProperties = {
  padding: "9px 16px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--warn)",
  borderRadius: "var(--r-md)",
  background: "var(--warn-soft)",
  color: "var(--warn)",
  fontFamily: "var(--font-ui)",
  fontSize: 12.5,
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
  fontFamily: "var(--font-mono)",
  fontSize: 16,
  width: "100%",
  boxSizing: "border-box",
  letterSpacing: "0.15em",
};

function QRDisplay({ uri }: { uri: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(uri, {
      margin: 1,
      width: 240,
      color: { dark: "#15120D", light: "#EFE7D4" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [uri]);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 16,
        background: "#EFE7D4",
        borderRadius: "var(--r-md)",
      }}
    >
      {dataUrl ? (
        <img src={dataUrl} alt="TOTP enrolment QR" width={240} height={240} />
      ) : (
        <div
          style={{
            width: 240,
            height: 240,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#15120D",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
          }}
        >
          Rendering QR…
        </div>
      )}
    </div>
  );
}

export function TotpEnrollmentRoute() {
  useTopbar(() => ({
    title: "Authenticator app (TOTP)",
    subtitle: "Second factor via FreeOTP, Aegis, Authy, etc.",
  }));

  const auth = useAuth();
  const qc = useQueryClient();
  const [beginData, setBeginData] = useState<
    | { secret: string; uri: string; account_name: string; issuer: string }
    | null
  >(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["totp-status", auth.session?.user_id],
    queryFn: async () => apiMethods.totpStatus(),
    enabled: auth.status === "authenticated",
  });

  const beginMutation = useMutation({
    mutationFn: async () => apiMethods.totpBegin(),
    onSuccess: (data) => {
      setBeginData(data);
      setError(null);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (c: string) => apiMethods.totpVerify({ code: c }),
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes);
      setBeginData(null);
      setCode("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["totp-status"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const disableMutation = useMutation({
    mutationFn: async () => apiMethods.totpDisable(),
    onSuccess: () => {
      setBeginData(null);
      setBackupCodes(null);
      qc.invalidateQueries({ queryKey: ["totp-status"] });
    },
  });

  const regenMutation = useMutation({
    mutationFn: async () => apiMethods.totpRegenerateBackupCodes(),
    onSuccess: (data) => {
      setBackupCodes(data.backup_codes);
      qc.invalidateQueries({ queryKey: ["totp-status"] });
    },
  });

  if (auth.status !== "authenticated") {
    return (
      <div style={PAGE}>
        <div style={CARD}>Sign in to configure your authenticator.</div>
      </div>
    );
  }

  // Post-verify state: backup codes visible once
  if (backupCodes) {
    return (
      <div style={PAGE}>
        <div style={{ ...CARD, background: "var(--peer-ok-soft, var(--bg-2))" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              color: "var(--ink)",
            }}
          >
            Enrolled ✓
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            Your authenticator is verified. Save the backup codes below
            somewhere safe (a password manager, printed and stored
            offline). Each code works once and only once — after you
            leave this page they cannot be shown again.
          </p>
        </div>
        <div style={CARD}>
          <div style={SECTION_LABEL}>Backup codes</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {backupCodes.map((c) => (
              <div
                key={c}
                style={{
                  padding: "10px 12px",
                  background: "var(--bg)",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--line)",
                  borderRadius: "var(--r-md)",
                  textAlign: "center",
                  letterSpacing: "0.1em",
                }}
              >
                {c}
              </div>
            ))}
          </div>
          <button
            type="button"
            style={QUIET_BUTTON}
            onClick={() => setBackupCodes(null)}
          >
            I've saved them — hide
          </button>
        </div>
      </div>
    );
  }

  // Mid-enrolment state: show QR + code input
  if (beginData) {
    return (
      <div style={PAGE}>
        <div style={CARD}>
          <div style={SECTION_LABEL}>Step 1 · Scan the code</div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink-soft)",
              lineHeight: 1.55,
            }}
          >
            Open your authenticator app (FreeOTP, Aegis, Authy, Google
            Authenticator, 1Password, Bitwarden — any TOTP app) and scan
            the QR below. If your app doesn't support scanning, enter
            the secret manually.
          </p>
          <QRDisplay uri={beginData.uri} />
          <div>
            <div style={SECTION_LABEL}>Secret (manual entry)</div>
            <div
              style={{
                marginTop: 8,
                padding: "10px 14px",
                background: "var(--bg)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                letterSpacing: "0.1em",
                color: "var(--ink)",
                userSelect: "all",
              }}
            >
              {beginData.secret}
            </div>
          </div>
        </div>
        <div style={CARD}>
          <div style={SECTION_LABEL}>Step 2 · Verify</div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
            }}
          >
            Enter the 6-digit code your app is showing right now.
          </p>
          <input
            style={INPUT}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoFocus
            aria-label="Verification code"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={PRIMARY_BUTTON}
              disabled={verifyMutation.isPending || !code.trim()}
              onClick={() => verifyMutation.mutate(code.trim())}
            >
              {verifyMutation.isPending ? "Verifying…" : "Verify + finish"}
            </button>
            <button
              type="button"
              style={QUIET_BUTTON}
              onClick={() => {
                setBeginData(null);
                setCode("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
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

  // Already enrolled — management view
  if (statusQuery.data?.enrolled) {
    return (
      <div style={PAGE}>
        <div style={CARD}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--ink)",
            }}
          >
            Authenticator enrolled ✓
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
            }}
          >
            You have {statusQuery.data.remaining_backup_codes} unused backup
            code{statusQuery.data.remaining_backup_codes === 1 ? "" : "s"}.
            If you lose access to your authenticator, use a backup code
            to sign in.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={QUIET_BUTTON}
              disabled={regenMutation.isPending}
              onClick={() => regenMutation.mutate()}
            >
              {regenMutation.isPending
                ? "Regenerating…"
                : "Regenerate backup codes"}
            </button>
            <button
              type="button"
              style={WARN_BUTTON}
              disabled={disableMutation.isPending}
              onClick={() => setDisableConfirmOpen(true)}
            >
              {disableMutation.isPending ? "Disabling…" : "Disable TOTP"}
            </button>
            <ConfirmDialog
              open={disableConfirmOpen}
              title="Disable TOTP for this account?"
              body="Your backup codes will be revoked. You can re-enrol at any time."
              confirmLabel="Disable TOTP"
              cancelLabel="Keep enabled"
              tone="destructive"
              onConfirm={() => {
                setDisableConfirmOpen(false);
                disableMutation.mutate();
              }}
              onCancel={() => setDisableConfirmOpen(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Not yet enrolled — begin
  return (
    <div style={PAGE}>
      <div style={CARD}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            color: "var(--ink)",
          }}
        >
          Add a second factor
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink-soft)",
            lineHeight: 1.55,
          }}
        >
          After enrolment, every sign-in will ask for a 6-digit code
          from your authenticator (or a backup code). This runs
          alongside your passkey — either can prove identity; enrolling
          both means you're covered if you lose one device.
        </p>
        <button
          type="button"
          style={PRIMARY_BUTTON}
          disabled={beginMutation.isPending}
          onClick={() => beginMutation.mutate()}
        >
          {beginMutation.isPending ? "Preparing…" : "Begin enrolment"}
        </button>
      </div>
    </div>
  );
}
