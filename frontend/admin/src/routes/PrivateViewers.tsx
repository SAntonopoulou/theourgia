/**
 * PrivateViewers — admin route at ``/private-viewers``.
 *
 * Wired to ``/api/v1/private-viewers`` per the admin API-wiring
 * convention. The issue mutation returns a one-time plaintext
 * credential which is logged via a transient state so the surface
 * can surface it (the credential-reveal modal lives in the surface
 * itself; this route forwards it).
 */

import { useMemo, useState } from "react";

import {
  type NewPrivateViewerDraft,
  type PrivateViewerRow,
  PrivateViewersSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type DeliveryKind,
  type PrivateViewerGrant,
  type ScopeKind,
  useIssueGrant,
  usePrivateViewerGrants,
  useRevokeGrant,
} from "../lib/privateViewers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function ago(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  const m = Math.floor(days / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "short" })}`;
}

function initialOf(label: string): string {
  return (label[0] ?? "·").toUpperCase();
}

function toRow(grant: PrivateViewerGrant): PrivateViewerRow {
  return {
    id: grant.id,
    label: grant.label,
    handle: grant.email_or_handle,
    lastUsed: ago(grant.last_used_at),
    scopeKind: grant.scope_kind,
    initial: initialOf(grant.label),
    revoked: grant.revoked_at !== null,
    revokedAt: grant.revoked_at ? formatDate(grant.revoked_at) : undefined,
  };
}

export function PrivateViewers() {
  useTopbar(() => ({ title: "Private viewers" }));

  const { data, isLoading, error, refetch } = usePrivateViewerGrants();
  const issue = useIssueGrant();
  const revoke = useRevokeGrant();
  const [revealCredential, setRevealCredential] = useState<string | null>(null);

  const rows = useMemo(
    () => (data ? data.map((g) => toRow(g)) : []),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your private viewers."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const mutationError = issue.error ?? revoke.error;

  return (
    <>
      {mutationError ? (
        <SurfaceError
          title="That action didn’t go through."
          message={mutationError.message}
          onRetry={() => {
            issue.reset();
            revoke.reset();
          }}
          retryLabel="Dismiss"
        />
      ) : null}
      {revealCredential ? (
        <div
          role="alert"
          style={{
            margin: "12px 16px",
            padding: 14,
            background: "var(--peer-ok-soft)",
            borderLeftStyle: "solid",
            borderLeftWidth: 3,
            borderLeftColor: "var(--peer-ok)",
            borderRadius: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontFamily: "inherit",
              color: "var(--ink)",
              fontWeight: 600,
            }}
          >
            One-time credential — copy now. We will never show it again.
          </p>
          <code
            style={{
              display: "block",
              padding: 8,
              background: "var(--bg-2)",
              wordBreak: "break-all",
            }}
          >
            {revealCredential}
          </code>
          <button
            type="button"
            onClick={() => setRevealCredential(null)}
            style={{
              marginTop: 8,
              padding: "4px 10px",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--peer-ok)",
              background: "transparent",
              borderRadius: 4,
              cursor: "pointer",
              color: "var(--peer-ok)",
              fontFamily: "var(--font-sans)",
            }}
          >
            I’ve copied it — dismiss
          </button>
        </div>
      ) : null}
      <PrivateViewersSurface
        viewers={rows}
        onIssueCredential={(draft: NewPrivateViewerDraft) => {
          issue.mutate(
            {
              label: draft.label,
              email_or_handle: draft.emailOrHandle,
              scope_kind: draft.scope as ScopeKind,
              delivery: draft.delivery as DeliveryKind,
            },
            {
              onSuccess: (data) => {
                setRevealCredential(data.plaintext_credential);
              },
            },
          );
        }}
        onViewerAction={(viewerId) => {
          // The surface fires a generic action key — for v1 we treat
          // every action as a revoke. Once the kebab menu has more
          // affordances (view audit · edit scope), this dispatches.
          revoke.mutate(viewerId);
        }}
      />
    </>
  );
}
