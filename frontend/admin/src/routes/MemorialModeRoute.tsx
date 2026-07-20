/**
 * Memorial mode admin route — b108-2hg.
 *
 * Wires MemorialModeSurface to the backend endpoints.
 */

import {
  ConfirmDialog,
  MemorialModeSurface,
  type MemorialConfig,
  Skeleton,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

function toastOk(title: string): void {
  Toast.push({ tone: "success", title });
}

function toastError(title: string, body: unknown): void {
  Toast.push({
    tone: "warning",
    title,
    body: body instanceof Error ? body.message : String(body ?? ""),
  });
}

/** UTF-8-safe base64 — the key-share endpoint takes secret_b64. */
function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function MemorialModeRoute() {
  useTopbar(
    () => ({
      title: "Memorial mode",
      subtitle:
        "Digital inheritance — check-in schedule, executor, memorial message",
    }),
    [],
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<MemorialConfig | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState<boolean>(false);
  const [confirmReactivate, setConfirmReactivate] = useState<boolean>(false);
  // v1-018 — shares from the latest generation; shown once, never stored.
  const [generatedShares, setGeneratedShares] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const row = (await apiMethods.getMemorialConfig()) as unknown as MemorialConfig;
      setConfig(row);
    } catch (e) {
      toastError("Could not load memorial config", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const handleSave = useCallback(
    async (patch: Partial<MemorialConfig>) => {
      try {
        await apiMethods.updateMemorialConfig(
          patch as Record<string, unknown>,
        );
        await load();
        toastOk("Saved");
      } catch (e) {
        toastError("Could not save", e);
      }
    },
    [load],
  );

  const handleCheckIn = useCallback(async () => {
    try {
      await apiMethods.memorialCheckIn();
      await load();
      toastOk("Check-in recorded");
    } catch (e) {
      toastError("Could not check in", e);
    }
  }, [load]);

  const doTrigger = useCallback(async () => {
    setConfirmTrigger(false);
    try {
      await apiMethods.memorialTrigger();
      await load();
      toastOk("Memorial mode activated");
    } catch (e) {
      toastError("Could not activate memorial mode", e);
    }
  }, [load]);

  const doReactivate = useCallback(async () => {
    setConfirmReactivate(false);
    try {
      await apiMethods.memorialReactivate();
      await load();
      toastOk("Vault reactivated");
    } catch (e) {
      toastError("Could not reactivate", e);
    }
  }, [load]);

  const handleGenerateKeyShare = useCallback(
    async (input: { secret: string; shares: number; threshold: number }) => {
      try {
        const result = await apiMethods.memorialKeyShare({
          secret_b64: toBase64(input.secret),
          shares: input.shares,
          threshold: input.threshold,
        });
        setGeneratedShares(result.shares_b64);
        await load();
        toastOk("Key-share generated");
      } catch (e) {
        toastError("Could not generate the key-share", e);
      }
    },
    [load],
  );

  if (loading || !config) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <Skeleton kind="text" width="60%" />
        <Skeleton kind="text" width="80%" />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-4)" }} data-route="memorial-mode">
      <MemorialModeSurface
        config={config}
        onCheckIn={() => void handleCheckIn()}
        onSave={(p) => void handleSave(p)}
        onTrigger={() => setConfirmTrigger(true)}
        onReactivate={() => setConfirmReactivate(true)}
        onGenerateKeyShare={(input) => void handleGenerateKeyShare(input)}
        generatedShares={generatedShares}
      />

      <ConfirmDialog
        open={confirmTrigger}
        tone="destructive"
        title="Enter memorial mode?"
        body="The vault becomes a read-only in-memoriam surface. Private writes are frozen. You can reactivate at any time."
        confirmLabel="Yes, enter memorial mode"
        onConfirm={() => void doTrigger()}
        onCancel={() => setConfirmTrigger(false)}
      />
      <ConfirmDialog
        open={confirmReactivate}
        tone="constructive"
        title="Reactivate the vault?"
        body="The vault returns to normal operation. The current time is recorded as your latest check-in."
        confirmLabel="Reactivate vault"
        onConfirm={() => void doReactivate()}
        onCancel={() => setConfirmReactivate(false)}
      />
    </div>
  );
}
