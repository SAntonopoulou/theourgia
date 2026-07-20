/**
 * KeyRotationRoute — /settings/keys.
 *
 * Wires the shared KeyRotationSurface to the real Mode A vault-key
 * backend (v1-027 · Phase 15 B5):
 *
 *   GET  /api/v1/keys/rotation-status — current-key card + progress
 *   GET  /api/v1/keys/history         — trusted key history
 *   POST /api/v1/keys/rotate          — Begin rotation (409 → toast)
 *
 * While a rotation is pending/running the surface is busy and the
 * route polls status until the sweep lands. Emergency revocation
 * stays an honest toast: a Mode A data key has no standalone revoke
 * semantics (revoking without a replacement would orphan content) —
 * rotation IS the remedy, and the backend ships exactly that.
 */

import {
  ApiError,
  type CurrentKey,
  type KeyHistoryEntry,
  type KeyRotationHistoryResponse,
  type KeyRotationStatusResponse,
  KeyRotationSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiMethods } from "../data/api.js";

const POLL_MS = 4000;

/** "SHA256:aaaa bbbb cccc dddd · eeee ffff gggg hhhh" from 64 hex chars. */
function displayFingerprint(hex: string): string {
  const chunks = hex.match(/.{1,4}/g) ?? [];
  return `SHA256:${chunks.slice(0, 4).join(" ")} · ${chunks.slice(4, 8).join(" ")}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "unknown";
  }
}

function toCurrentKey(status: KeyRotationStatusResponse): CurrentKey {
  if (!status.current_key) {
    return {
      // Honest empty state: the vault has no data key until the first
      // rotation provisions one. Begin rotation below does exactly that.
      fingerprint: "none yet — your first rotation creates it",
      createdOn: "—",
      // Per-read DEK usage is not tracked (only rotations are audited).
      lastUsed: "not individually tracked",
    };
  }
  return {
    fingerprint: displayFingerprint(status.current_key.fingerprint_sha256),
    createdOn: formatDate(status.current_key.created_at),
    lastUsed: "not individually tracked",
  };
}

function toHistory(history: KeyRotationHistoryResponse): KeyHistoryEntry[] {
  return (history.items ?? [])
    .filter((item) => item.retired_key_fingerprint_sha256 !== null)
    .map((item) => ({
      fingerprint: displayFingerprint(item.retired_key_fingerprint_sha256!),
      retiredOn: formatDate(item.retired_at),
    }));
}

function isActive(status: KeyRotationStatusResponse | null): boolean {
  const state = status?.rotation?.state;
  return state === "pending" || state === "running";
}

export function KeyRotationRoute() {
  useTopbar(
    () => ({
      title: "Vault encryption key",
      subtitle: "The Mode A data key that protects your vault at rest",
    }),
    [],
  );

  const [status, setStatus] = useState<KeyRotationStatusResponse | null>(null);
  const [history, setHistory] = useState<KeyRotationHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finishToastArmed = useRef(false);

  const refresh = useCallback(async () => {
    const [nextStatus, nextHistory] = await Promise.all([
      apiMethods.getKeyRotationStatus(),
      apiMethods.listKeyRotationHistory(),
    ]);
    setStatus(nextStatus);
    setHistory(nextHistory);
    return nextStatus;
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Poll while a rotation is in flight; announce when the sweep lands.
  useEffect(() => {
    if (!isActive(status)) return;
    finishToastArmed.current = true;
    const timer = window.setInterval(() => {
      refresh()
        .then((next) => {
          if (!isActive(next) && finishToastArmed.current) {
            finishToastArmed.current = false;
            if (next.rotation?.state === "done") {
              Toast.push({
                tone: "success",
                title: "Rotation complete",
                body: "Every envelope now sits under the new key. The old key moved to your trusted history.",
              });
            } else if (next.rotation?.state === "failed") {
              Toast.push({
                tone: "warning",
                title: "Rotation did not finish",
                body:
                  next.rotation.error ??
                  "The re-encryption sweep stopped. Nothing was lost; see the audit log.",
              });
            }
          }
        })
        .catch(() => {
          // Transient poll failure — the next tick retries.
        });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, refresh]);

  const beginRotation = useCallback(async () => {
    try {
      const started = await apiMethods.startKeyRotation();
      setStatus(started);
      if (started.rotation?.state === "done") {
        Toast.push({
          tone: "success",
          title: "Vault key ready",
          body: "Your vault's data key is provisioned and active.",
        });
      } else {
        Toast.push({
          tone: "info",
          title: "Rotation started",
          body: "The new key is active now. A background sweep re-encrypts your existing content — old envelopes stay readable throughout.",
        });
      }
      await refresh().catch(() => undefined);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        Toast.push({
          tone: "warning",
          title: "A rotation is already running",
          body: "Wait for the current sweep to finish before starting another.",
        });
        await refresh().catch(() => undefined);
        return;
      }
      Toast.push({
        tone: "warning",
        title: "Couldn't start the rotation",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [refresh]);

  const revoke = useCallback(() => {
    // Honest toast: a Mode A data key has no standalone revoke
    // operation — without a replacement key the vault's content
    // would be orphaned. Rotation is the remedy for suspected
    // exposure, and it is real (above).
    Toast.push({
      tone: "warning",
      title: "Revocation is rotation here",
      body: "A vault data key cannot be revoked on its own — content would become unreadable. If you suspect exposure, begin a rotation: the old key retires as soon as the sweep completes.",
    });
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 620, margin: "40px auto", padding: "0 24px" }}>
        <div
          style={{
            padding: "22px 24px",
            border: "1px solid var(--warn-border)",
            background: "var(--warn-soft)",
            borderRadius: "var(--r-lg)",
            fontFamily: "var(--font-ui)",
            color: "var(--warn)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Couldn't load your vault key
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink-soft)" }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!status || !history) {
    return (
      <div style={{ maxWidth: 620, margin: "40px auto", padding: "0 24px", color: "var(--ink-mute)" }}>
        Loading current vault key…
      </div>
    );
  }

  return (
    <KeyRotationSurface
      current={toCurrentKey(status)}
      history={toHistory(history)}
      busy={isActive(status)}
      onBeginRotation={() => {
        void beginRotation();
      }}
      onRevoke={revoke}
    />
  );
}
