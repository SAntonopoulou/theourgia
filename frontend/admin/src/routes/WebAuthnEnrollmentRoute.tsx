/**
 * WebAuthn enrolment — H10 B1 Security link target.
 *
 * List + add + rename + revoke passkey / hardware-key credentials.
 * The AccountSettings B1 hub links here as `/settings/webauthn`.
 *
 * Rule 48 sibling — the raw credential_id blob is never surfaced;
 * credentials render by nickname + transports + last-used timestamp.
 */

import {
  isWebauthnSupported,
  useAuth,
  useTopbar,
  type WebauthnCredentialRead,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useState } from "react";

import { apiMethods } from "../data/api.js";

const PAGE: CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

const SECTION_LABEL: CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
  marginBottom: 10,
};

const CARD: CSSProperties = {
  padding: "16px 18px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--line)",
  borderRadius: "var(--r-md)",
  background: "var(--bg-2)",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const delta = Math.max(0, Date.now() - then);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "moments ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function CredentialRow({
  row,
  onRename,
  onRevoke,
  busy,
}: {
  row: WebauthnCredentialRead;
  onRename: (nickname: string) => void;
  onRevoke: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.nickname);
  return (
    <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
            }}
          />
        ) : (
          <div
            style={{
              flex: 1,
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            {row.nickname}
          </div>
        )}
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                onRename(draft.trim() || row.nickname);
                setEditing(false);
              }}
              disabled={busy}
              style={{
                padding: "6px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--accent)",
                borderRadius: "var(--r-md)",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(row.nickname);
                setEditing(false);
              }}
              style={{
                padding: "6px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: "var(--line-2)",
                borderRadius: "var(--r-md)",
                background: "transparent",
                color: "var(--ink)",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              padding: "6px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "transparent",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Rename
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 18,
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-mute)",
        }}
      >
        <span>
          <strong style={{ color: "var(--ink-soft)" }}>Transports:</strong>{" "}
          {row.transports || "unknown"}
        </span>
        <span>
          <strong style={{ color: "var(--ink-soft)" }}>Last used:</strong>{" "}
          {relativeTime(row.last_used_at)}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          style={{
            padding: "6px 12px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--warn)",
            borderRadius: "var(--r-md)",
            background: "var(--warn-soft)",
            color: "var(--warn)",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          Revoke
        </button>
      </div>
    </div>
  );
}

export function WebAuthnEnrollmentRoute() {
  useTopbar(() => ({
    title: "Passkeys & hardware keys",
    subtitle: "Sign in without a password",
  }));

  const qc = useQueryClient();
  const auth = useAuth();
  const supported = isWebauthnSupported();

  const query = useQuery({
    queryKey: ["webauthn-credentials"],
    queryFn: async () => apiMethods.listWebauthnCredentials(),
    staleTime: 15_000,
  });

  const enrol = useMutation({
    mutationFn: async (nickname: string) =>
      auth.enrolWebAuthnCredential(nickname),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webauthn-credentials"] }),
  });

  const rename = useMutation({
    mutationFn: async (input: { id: string; nickname: string }) =>
      apiMethods.renameWebauthnCredential(input.id, input.nickname),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webauthn-credentials"] }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => apiMethods.revokeWebauthnCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webauthn-credentials"] }),
  });

  const [newNickname, setNewNickname] = useState("");
  const rows = query.data?.credentials ?? [];

  return (
    <div style={PAGE}>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          color: "var(--ink-soft)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        A passkey binds this account to a device or hardware key. Enrol one
        or more; sign in without a password from any of them.
      </p>

      {!supported ? (
        <div
          style={{
            ...CARD,
            background: "var(--warn-soft)",
            borderColor: "var(--warn)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            WebAuthn is not available in this browser
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              color: "var(--ink-soft)",
            }}
          >
            Try Chrome, Safari, Firefox, or Edge over HTTPS. Some browsers
            require a secure context (localhost or https://) for the WebAuthn
            APIs to be enabled.
          </p>
        </div>
      ) : null}

      <div style={SECTION_LABEL}>Enrolled credentials</div>
      {query.isPending ? (
        <div style={{ ...CARD, color: "var(--ink-mute)" }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div
          style={{
            ...CARD,
            color: "var(--ink-mute)",
            fontFamily: "var(--font-serif)",
          }}
        >
          No credentials yet. Enrol your first key below.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row) => (
            <CredentialRow
              key={row.id}
              row={row}
              busy={rename.isPending || revoke.isPending}
              onRename={(nickname) => rename.mutate({ id: row.id, nickname })}
              onRevoke={() => revoke.mutate(row.id)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div style={SECTION_LABEL}>Enrol a new credential</div>
        <div
          style={{
            ...CARD,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <label
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            Nickname (shown here only)
          </label>
          <input
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="e.g. YubiKey 5, Athens laptop"
            style={{
              padding: "9px 12px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontSize: 14,
            }}
          />
          <button
            type="button"
            disabled={!supported || enrol.isPending}
            onClick={() => {
              const nickname = newNickname.trim() || "New key";
              enrol.mutate(nickname, {
                onSuccess: () => setNewNickname(""),
              });
            }}
            style={{
              padding: "10px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--accent)",
              borderRadius: "var(--r-md)",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: !supported || enrol.isPending ? "wait" : "pointer",
            }}
          >
            {enrol.isPending
              ? "Follow your device's prompt…"
              : "Enrol a key"}
          </button>
          {enrol.isError ? (
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                color: "var(--warn)",
              }}
            >
              {(enrol.error as Error).message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
