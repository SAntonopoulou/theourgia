/**
 * SandboxBrowser — admin route at ``/sandbox``.
 *
 * Wired to the live ``/api/v1/sandbox`` endpoint per the admin
 * API-wiring convention (TanStack Query · SurfaceSkeleton ·
 * inline --warn-soft SurfaceError).
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  type SandboxRow,
  SandboxBrowserSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type Sandbox,
  useDiscardSandbox,
  usePromoteSandbox,
  useSandboxes,
} from "../lib/sandbox.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function timeAgo(iso: string, now: number = Date.now()): string {
  const created = new Date(iso).getTime();
  const days = Math.floor((now - created) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function expiresLabel(iso: string, now: number = Date.now()): {
  label: string;
  near: boolean;
} {
  const expires = new Date(iso).getTime();
  const days = Math.ceil((expires - now) / DAY_MS);
  if (days <= 0) return { label: "Expired", near: true };
  if (days === 1) return { label: "Expires tomorrow", near: true };
  return { label: `Expires in ${days} days`, near: days <= 3 };
}

function toRow(sandbox: Sandbox): SandboxRow {
  const exp = expiresLabel(sandbox.expires_at);
  return {
    id: sandbox.id,
    label: sandbox.label,
    origin: sandbox.source,
    createdAgo: timeAgo(sandbox.created_at),
    expiresLabel: exp.label,
    expiryNearby: exp.near,
  };
}

export function SandboxBrowser() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Sandbox" }));

  const { data, isLoading, error, refetch } = useSandboxes();
  const promote = usePromoteSandbox();
  const discard = useDiscardSandbox();

  const rows = useMemo(
    () => (data ? data.map((s) => toRow(s)) : []),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={3} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your sandboxes."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const mutationError = promote.error ?? discard.error;

  return (
    <>
      {mutationError ? (
        <SurfaceError
          title="That action didn’t go through."
          message={mutationError.message}
          onRetry={() => {
            promote.reset();
            discard.reset();
          }}
          retryLabel="Dismiss"
        />
      ) : null}
      <SandboxBrowserSurface
        sandboxes={rows}
        onOpen={(id: string) => navigate(`/sandbox/${id}`)}
        onPromote={(id: string) => promote.mutate(id)}
        onDiscard={(id: string) => discard.mutate(id)}
        onPreserve={(id: string) => {
          // Preserve = extend the sandbox's expires_at. Backend
          // endpoint queued; for now we navigate to the detail view
          // where the user can review and re-promote.
          navigate(`/sandbox/${id}`);
        }}
      />
    </>
  );
}
