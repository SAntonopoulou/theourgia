/**
 * SandboxDetail — admin route at ``/sandbox/:id``.
 *
 * Live-wired: fetches the sandbox row from the current user's
 * `/api/v1/sandbox` list and shows its label + expires_at. Content
 * cards (the actual bundle rows inside the sandbox) don't have a
 * dedicated preview endpoint yet — see the Phase 14 handoff — so the
 * cards list is intentionally empty until that endpoint ships.
 *
 * Promote and discard go through the real POST /sandbox/{id}/promote
 * and DELETE /sandbox/{id} endpoints.
 */

import { Toast, useTopbar } from "@theourgia/shared";
import type { SandboxContentCard } from "@theourgia/shared";
import { SandboxDetailSurface } from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface WireSandbox {
  id: string;
  kind: "bundle" | "plugin";
  label: string;
  source: string;
  notes: string;
  created_at: string;
  expires_at: string;
}

interface WireSandboxList {
  sandboxes: WireSandbox[];
}

const NO_CARDS: SandboxContentCard[] = [];

export function SandboxDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Sandbox" }));

  const [sandbox, setSandbox] = useState<WireSandbox | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    apiClient
      .request<WireSandboxList>("/api/v1/sandbox")
      .then((rows) => {
        if (cancelled) return;
        const row = rows.sandboxes.find((s) => s.id === id) ?? null;
        setSandbox(row);
        setNotFound(row === null);
      })
      .catch((e) => {
        Toast.push({
          tone: "error",
          title: "Couldn't load sandbox",
          body: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePromote = useCallback(async () => {
    if (!id) return;
    try {
      await apiClient.request<Record<string, unknown>>(
        `/api/v1/sandbox/${encodeURIComponent(id)}/promote`,
        { method: "POST", json: {} },
      );
      Toast.push({
        tone: "success",
        title: "Sandbox promoted",
        body: "Its contents are now part of your main vault.",
      });
      navigate("/sandbox");
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't promote",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [id, navigate]);

  const handleDiscard = useCallback(async () => {
    if (!id) return;
    try {
      await apiClient.request<Record<string, unknown>>(
        `/api/v1/sandbox/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      Toast.push({
        tone: "success",
        title: "Sandbox discarded",
        body: "Its contents were never imported.",
      });
      navigate("/sandbox");
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Couldn't discard",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }, [id, navigate]);

  const label = sandbox
    ? sandbox.label
    : notFound
      ? "(sandbox not found)"
      : "Loading…";
  const expiresAtLabel = sandbox
    ? new Date(sandbox.expires_at).toLocaleDateString()
    : "—";

  return (
    <SandboxDetailSurface
      sandboxLabel={label}
      expiresAtLabel={expiresAtLabel}
      cards={NO_CARDS}
      onBreadcrumbHome={() => navigate("/sandbox")}
      onPromote={() => void handlePromote()}
      onDiscard={() => void handleDiscard()}
    />
  );
}
