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
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

// Default scope shipped on every install — broadest grants the user
// selected at install time. The install-detail endpoint will replace
// this with the actual install's granted scope set.
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

  const mutation = useMutation({
    mutationFn: async (payload: { task: string; scopeId: string }) => {
      if (!installId) throw new Error("missing installId");
      return apiMethods.startAgentRun({
        install_id: installId,
        agent_slug: installId,  // placeholder until install-detail endpoint lands
        task_text: payload.task,
        granted_caps: ["read.entries"],
        scope_id: payload.scopeId,
        monthly_cap_usd: "10.00",
      });
    },
    onSuccess: (snapshot) => {
      navigate(`/agents/runs/${encodeURIComponent(snapshot.run_id)}`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : String(err));
    },
  });

  return (
    <AgentTaskComposerSurface
      preamble="Describe the working you want to delegate. The agent reads what your capability grants allow — sealed and closed-tradition records never leave the vault."
      scopes={DEFAULT_SCOPES}
      busy={mutation.isPending}
      disabledReason={error ?? undefined}
      onStart={(payload) => {
        setError(null);
        mutation.mutate(payload);
      }}
    />
  );
}
