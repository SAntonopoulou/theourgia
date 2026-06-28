/**
 * AccountDeletion — H10 B3 admin route.
 *
 * Three-step confirmation: type magickal name verbatim · type the
 * account-start date verbatim (ISO `YYYY-MM-DD`, drawn from the user's
 * `/api/v1/me` `account_created_at`) · tap Schedule deletion.
 *
 * On success the surface flips to a reactivation banner using the
 * `--warn-soft` palette (rule 46 — 30-day grace, calm tone, no danger).
 *
 * Mounted at /settings/delete-account.
 */

import {
  AccountDeletionSurface,
  useAuth,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties } from "react";

import { apiMethods } from "../data/api.js";

function isoDay(dt: string | null | undefined): string {
  if (!dt) return "";
  return new Date(dt).toISOString().slice(0, 10);
}

const PANEL: CSSProperties = {
  maxWidth: 580,
  margin: "0 auto",
  padding: "26px 24px 48px",
};

export function AccountDeletionRoute() {
  useTopbar(() => ({
    title: "Delete your account",
    subtitle: "30-day grace period · always reactivable",
  }));

  const { session } = useAuth();
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => apiMethods.getMe(),
    staleTime: 60_000,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => apiMethods.scheduleAccountDeletion(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => apiMethods.reactivateAccount(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const me = meQuery.data;
  const magickalName =
    session?.magickal_name?.trim() ||
    session?.display_name ||
    "your magickal name";
  const startDate = isoDay(me?.account_created_at);
  const scheduledFor = me?.scheduled_for_deletion_at ?? null;

  if (scheduledFor) {
    const when = new Date(scheduledFor);
    return (
      <div style={PANEL}>
        <div
          style={{
            padding: "18px 20px",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--line)",
            borderRadius: "var(--r-lg)",
            background: "var(--warn-soft)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              color: "var(--ink)",
              marginBottom: 6,
            }}
          >
            Deletion scheduled
          </div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 14,
              color: "var(--ink-soft)",
              lineHeight: 1.6,
              margin: "0 0 14px",
            }}
          >
            Your account is set to be permanently removed on{" "}
            <strong>{when.toUTCString()}</strong>. Until then you can sign
            in normally and reactivate at any time.
          </p>
          <button
            type="button"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            style={{
              padding: "9px 16px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--line-2)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: reactivateMutation.isPending ? "wait" : "pointer",
            }}
          >
            {reactivateMutation.isPending
              ? "Reactivating…"
              : "Keep my account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AccountDeletionSurface
      magickalName={magickalName}
      startDate={startDate}
      busy={scheduleMutation.isPending}
      onSchedule={() => scheduleMutation.mutate()}
      onKeepVault={() => {
        window.location.href = "/settings/data-export";
      }}
    />
  );
}
