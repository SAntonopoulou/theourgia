/**
 * AgentTaskComposer — H10 C6 admin route (live data).
 *
 * Write-flow surface: magician composes a task + scope, submit fires
 * apiMethods.startAgentRun. On success navigates to the new run's
 * /agents/runs/:runId monitor.
 *
 * Mounted at /agents/:installId/compose. install_id from the path;
 * the granted_caps + monthly_cap come from a dedicated install-detail
 * endpoint when that lands; for v1 we use sensible defaults.
 *
 * NOTE: the daemon's startAgentRun requires `vault_did` (already
 * resolved server-side on the bridge — see `_vault_did_for_user`) +
 * `vault_session_token` (also server-side). The client passes the
 * task text + granted_caps + scope_id; the bridge fills the rest.
 */

import {
  AgentTaskComposerSurface,
  type ScopeOption,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

// Two coarse scope presets — the install-detail endpoint doesn't yet
// carry a per-install scope set, so we render these as the same two
// on every install. When the daemon exposes granted capabilities on
// the install snapshot, the "default" scope will map to the real
// grant list.
const DEFAULT_SCOPES: readonly ScopeOption[] = [
  { id: "default", label: "Default — all granted capabilities" },
  { id: "read-only", label: "Read-only — no writes" },
];

export function AgentTaskComposerRoute() {
  const navigate = useNavigate();
  const { installId } = useParams<{ installId: string }>();
  const [error, setError] = useState<string | null>(null);

  useTopbar(() => ({
    title: "Compose task",
    subtitle: installId ?? "—",
  }));

  const install = useQuery({
    queryKey: ["agent-install", installId],
    queryFn: async () =>
      installId
        ? apiMethods.getAgentInstall(installId)
        : Promise.reject(new Error("missing installId")),
    enabled: Boolean(installId),
  });

  const mutation = useMutation({
    mutationFn: async (payload: { task: string; scopeId: string }) => {
      if (!installId) throw new Error("missing installId");
      if (!install.data) throw new Error("install not yet loaded");
      // Read-only scope: read.entries only. Default: the install's
      // configured broadest reads (still not exposed on the snapshot,
      // so we send read.entries + read.entities as the widest safe
      // default until the daemon adds a granted_caps field).
      const granted_caps =
        payload.scopeId === "read-only"
          ? ["read.entries"]
          : ["read.entries", "read.entities"];
      return apiMethods.startAgentRun({
        install_id: installId,
        agent_slug: install.data.agent_id,
        task_text: payload.task,
        granted_caps,
        scope_id: payload.scopeId,
        monthly_cap_usd: install.data.monthly_cost_cap_usd,
      });
    },
    onSuccess: (snapshot) => {
      navigate(`/agents/runs/${encodeURIComponent(snapshot.run_id)}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  const disabledReason =
    error ??
    (install.isLoading
      ? "Loading install details…"
      : install.error
        ? install.error instanceof Error
          ? install.error.message
          : String(install.error)
        : undefined);

  return (
    <AgentTaskComposerSurface
      preamble="Describe the working you want to delegate. The agent reads what your capability grants allow — sealed and closed-tradition records never leave the vault."
      scopes={DEFAULT_SCOPES}
      busy={mutation.isPending}
      disabledReason={disabledReason}
      onStart={(payload) => {
        setError(null);
        mutation.mutate(payload);
      }}
    />
  );
}
