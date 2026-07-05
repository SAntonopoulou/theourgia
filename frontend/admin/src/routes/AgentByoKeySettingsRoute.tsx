/**
 * AgentByoKeySettings — H10 C5 admin route.
 *
 * For v1 we wire the LIST + status display end-to-end (which installs
 * have a key configured vs not). The "Save key" + "Override per
 * agent" actions log to console + show a placeholder modal — Mode B
 * encryption + persistence endpoint lands when the daemon's
 * `core/crypto.py` is wired through a POST /installs/{id}/key
 * endpoint (the primitives are ready; the route is queued).
 *
 * Mounted at /agents-keys.
 */

import {
  AgentByoKeySettingsSurface,
  type PerAgentKeyRow,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { apiMethods } from "../data/api.js";

export function AgentByoKeySettingsRoute() {
  useTopbar(() => ({
    title: "Keys",
    subtitle: "Your API keys never leave your instance",
  }));

  const installsQuery = useQuery({
    queryKey: ["agent-installs", "byo-key"],
    queryFn: async () => apiMethods.listAgentInstalls(),
    staleTime: 30_000,
  });

  // The instance-wide "hasKey" question: do ANY installs have a key?
  // (At install time the user can opt into a per-instance shared key
  // OR a per-agent override; this surface shows both.)
  const hasKey = (installsQuery.data?.installs ?? []).some(
    (i) => i.has_api_key,
  );

  const perAgent = useMemo<PerAgentKeyRow[]>(() => {
    const rows = installsQuery.data?.installs ?? [];
    return rows.map<PerAgentKeyRow>((row) => ({
      id: row.id,
      name: row.display_name,
      kind: row.has_api_key ? "own" : "shared",
    }));
  }, [installsQuery.data]);

  return (
    <AgentByoKeySettingsSurface
      hasKey={hasKey}
      perAgent={perAgent}
      onSaveKey={() => {
        // Mode B encryption endpoint (POST /installs/{id}/key) is
        // still queued behind daemon core/crypto.py wiring. Loud
        // about that instead of pretending to save.
        Toast.push({
          tone: "info",
          title: "Key not saved",
          body: "The BYO-key persistence endpoint is queued behind the daemon's Mode B encryption wiring.",
        });
      }}
      onReset={() => {
        Toast.push({
          tone: "info",
          title: "Reset not wired",
          body: "The reset endpoint ships with the same daemon batch as save.",
        });
      }}
      onConnectSubscription={() => {
        Toast.push({
          tone: "info",
          title: "Subscription connect · Phase 16.1",
          body: "Claude Max OAuth/PAT wiring lands in Phase 16.1.",
        });
      }}
      onOverrideAgent={() => {
        Toast.push({
          tone: "info",
          title: "Per-agent override not wired",
          body: "Lands with the daemon's per-install key endpoint.",
        });
      }}
    />
  );
}
