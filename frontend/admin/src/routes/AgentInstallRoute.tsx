/**
 * AgentInstall — H10 C3 admin route (live install flow).
 *
 * Reviews the agent the magician picked from the marketplace + lets
 * them set their monthly cost cap before installing. On submit, fires
 * apiMethods.createAgentInstall which calls the bridge → daemon →
 * DB. On success navigates to /agents-home (the new install appears
 * in the active list once its state flips to active — which happens
 * after the C5 BYO Key step lands; for now installs land at inactive
 * which is honest about the not-yet-key-configured state).
 *
 * Mounted at /agents-marketplace/:agentSlug.
 */

import {
  type AgentCapabilityChip,
  AgentInstallSurface,
  useTopbar,
} from "@theourgia/shared";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

// Placeholder capabilities — until the marketplace card carries per-
// agent capability data + we can fetch the marketplace detail.
// Surfacing the wire keys verbatim (rule 31 — few clear capabilities,
// no opaque bundles).
const DEFAULT_CAPABILITIES: readonly AgentCapabilityChip[] = [
  {
    label: "Read your journal entries",
    wireKey: "read.entries",
    note: "Sealed entries are never returned. Closed-tradition tags are filtered.",
  },
  {
    label: "Read your magical beings",
    wireKey: "read.entities",
    note: "Closed-tradition entities are filtered.",
  },
];

export function AgentInstallRoute() {
  const navigate = useNavigate();
  const { agentSlug } = useParams<{ agentSlug: string }>();

  useTopbar(() => ({
    title: "Install agent",
    subtitle: agentSlug ?? "—",
  }));

  const mutation = useMutation({
    mutationFn: async (payload: {
      costCapMonthly: number;
      installInactive: boolean;
    }) => {
      if (!agentSlug) throw new Error("missing agentSlug");
      return apiMethods.createAgentInstall({
        agent_id: agentSlug,
        display_name: agentSlug,
        kind: "reviewer",  // placeholder; marketplace detail will provide kind
        monthly_cost_cap_usd: payload.costCapMonthly.toFixed(2),
      });
    },
    onSuccess: () => {
      navigate("/agents-home");
    },
    onError: (err) => {
      console.error("AgentInstall failed:", err);
    },
  });

  return (
    <AgentInstallSurface
      preamble={
        "This agent will run under capabilities you grant it. Capabilities are " +
        "enforced at the wire — sealed and closed-tradition records never leave " +
        "the vault, even when the agent has read access."
      }
      capabilities={DEFAULT_CAPABILITIES}
      memoryDirPath={`/srv/theourgia/agents/${agentSlug ?? "your-vault-id"}/your-install/`}
      hasKey={false}
      initialCostCap="10.00"
      configureKeyHref="/agents/settings/keys"
      onCancel={() => navigate(-1)}
      onInstall={(payload) => {
        mutation.mutate(payload);
      }}
    />
  );
}
