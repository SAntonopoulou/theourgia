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

// The marketplace endpoint doesn't yet return per-agent capability
// data. Rather than pin a fabricated pair of capabilities that every
// install would display regardless of what the agent actually needs
// (rule 31: no opaque bundles), we render an empty capability set
// and let the daemon prompt for grants at first-run. When the
// marketplace detail carries capabilities the surface will fill in.
const CAPABILITIES_PLACEHOLDER: readonly AgentCapabilityChip[] = [];

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
        "the vault, even when the agent has read access. The agent's declared " +
        "capabilities aren't yet returned by the marketplace endpoint; you'll " +
        "be prompted to grant each one at first run."
      }
      capabilities={CAPABILITIES_PLACEHOLDER}
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
