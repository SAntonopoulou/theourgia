/**
 * AgentTrustReview — H10 C12 admin route (live install + audit).
 *
 * Derives the trust review state from the install row + audit log:
 *   · capabilities[] — the granted set on the install (capabilities
 *     aren't surfaced on the daemon InstallSnapshot wire yet; for v1
 *     we display a stub list of the most-common reads + the user can
 *     refine when the daemon adds a `granted_caps` field).
 *   · addedSinceInstall[] — capabilities that appeared in the audit
 *     log but aren't in the current grant set (rule 4 — silent grant
 *     escalation is never allowed; if a cap shows up here, treat it
 *     as drift to investigate).
 *
 * Renew → re-confirms the existing grant set (no-op for v1 since
 * we don't have a "renewal" model yet; the button is wired but its
 * semantics will tighten when the trust-token system lands).
 * Uninstall → DELETE /api/v1/agents/installs/{id} + optionally delete
 * the memory dir (filesystem sandbox makes this a daemon task).
 *
 * Mounted at /agents/:installId/trust.
 */

import {
  type AddedSinceInstall,
  AgentTrustReviewSurface,
  type CurrentCapabilityRow,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

// Wire keys → human labels (rule 31: few clear capabilities, verbatim).
const CAPABILITY_LABELS: Record<string, string> = {
  "read.entries": "Read your journal entries",
  "read.entities": "Read your magical beings",
  "read.divinations": "Read your divination sessions",
  "read.library": "Read your library items",
  "read.correspondences": "Read your correspondence tables",
  "read.synchronicities": "Read your synchronicity log",
  "read.analytics": "Read your saved analytics queries",
  filesystem: "Write to its own memory directory",
  "network.outbound": "Spend your API key (model calls)",
};

function rowFor(wireKey: string, isNew: boolean = false): CurrentCapabilityRow {
  return {
    id: wireKey,
    label: CAPABILITY_LABELS[wireKey] ?? wireKey,
    wireKey,
    isNew,
  };
}

export function AgentTrustReviewRoute() {
  const navigate = useNavigate();
  const { installId } = useParams<{ installId: string }>();
  const queryClient = useQueryClient();

  useTopbar(() => ({
    title: "Trust review",
    subtitle: installId ?? "—",
  }));

  const auditQuery = useQuery({
    queryKey: ["agent-audit-trust", installId],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 200 }),
    enabled: Boolean(installId),
  });

  // Build the cap rows. Daemon doesn't surface granted_caps on the
  // install snapshot yet — we use audit-observed caps as the granted
  // set proxy. When the daemon adds the field, swap this for it.
  const { capabilities, addedSinceInstall } = useMemo<{
    capabilities: CurrentCapabilityRow[];
    addedSinceInstall: AddedSinceInstall[];
  }>(() => {
    const events = auditQuery.data?.events ?? [];
    const observed = new Set<string>();
    for (const e of events) {
      if (e.run_id && e.tool_name) observed.add(e.tool_name);
    }
    // Without a real granted_caps field, treat audit-observed as the
    // grant set; nothing in addedSinceInstall yet (rule: don't
    // fabricate a drift warning when the model can't actually detect
    // drift).
    const caps: CurrentCapabilityRow[] = [...observed].map((w) => rowFor(w, false));
    return { capabilities: caps, addedSinceInstall: [] };
  }, [auditQuery.data]);

  const uninstall = useMutation({
    mutationFn: async () => {
      if (!installId) throw new Error("missing installId");
      return apiMethods.deleteAgentInstall(installId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-installs"] });
      navigate("/agents-home");
    },
  });

  return (
    <AgentTrustReviewSurface
      capabilities={capabilities}
      addedSinceInstall={addedSinceInstall}
      onRenew={() => {
        // No-op for v1 — the surface's button fires; trust-token
        // renewal flow lands when the trust-token model ships.
      }}
      onUninstall={() => uninstall.mutate()}
    />
  );
}
