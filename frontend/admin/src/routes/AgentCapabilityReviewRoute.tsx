/**
 * AgentCapabilityReview — H10 C4 admin route.
 *
 * Modal-style surface — shown as a route page in v1 (the full-page
 * modal pattern matches the design). Reads the install + derives the
 * capability list from the audit-observed set (same provisional
 * approach as C12 TrustReview); when the daemon adds granted_caps
 * to the install snapshot, swap for that field.
 *
 * Mounted at /agents/:installId/capabilities.
 */

import {
  type AgentCapabilityRow,
  AgentCapabilityReviewSurface,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const CAPABILITY_NOTES: Record<string, { label: string; note: string }> = {
  "read.entries": {
    label: "Read journal entries",
    note: "Sealed entries never returned. Closed-tradition tags filtered.",
  },
  "read.entities": {
    label: "Read magical beings",
    note: "Closed-tradition entities filtered.",
  },
  "read.divinations": {
    label: "Read divination sessions",
    note: "Sealed sessions never returned.",
  },
  "read.library": {
    label: "Read library items",
    note: "Closed-tradition items filtered.",
  },
  "read.correspondences": {
    label: "Read correspondence tables",
    note: "Bundles flagged closed-tradition are filtered.",
  },
  "read.synchronicities": {
    label: "Read synchronicity log",
    note: "Sealed entries excluded.",
  },
  "read.analytics": {
    label: "Read saved analytics queries",
    note: "Only your own queries; no cross-magician access.",
  },
  filesystem: {
    label: "Write to its own memory dir",
    note: "Bounded to /srv/theourgia/agents/<vault>/<install>/ (rule 59).",
  },
  "network.outbound": {
    label: "Spend your API key",
    note: "Daemon's HTTP proxy gates calls to your configured provider host only.",
  },
};

function rowFor(wireKey: string): AgentCapabilityRow {
  const info = CAPABILITY_NOTES[wireKey];
  return {
    wireKey,
    label: info?.label ?? wireKey,
    note: info?.note ?? "No additional honesty notes for this capability.",
  };
}

export function AgentCapabilityReviewRoute() {
  const navigate = useNavigate();
  const { installId } = useParams<{ installId: string }>();

  useTopbar(() => ({
    title: "Capability review",
    subtitle: installId ?? "—",
  }));

  const installQuery = useQuery({
    queryKey: ["agent-install", installId],
    queryFn: async () => {
      if (!installId) throw new Error("missing installId");
      return apiMethods.getAgentInstall(installId);
    },
    enabled: Boolean(installId),
  });

  const auditQuery = useQuery({
    queryKey: ["agent-audit-cap-review", installId],
    queryFn: async () => apiMethods.queryAgentAudit({ limit: 200 }),
    enabled: Boolean(installId),
  });

  const granted = useMemo<AgentCapabilityRow[]>(() => {
    const events = auditQuery.data?.events ?? [];
    const observed = new Set<string>();
    for (const e of events) {
      if (e.run_id && e.tool_name) observed.add(e.tool_name);
    }
    return [...observed].sort().map(rowFor);
  }, [auditQuery.data]);

  return (
    <AgentCapabilityReviewSurface
      scenario="install"
      agentName={installQuery.data?.display_name ?? installId ?? "—"}
      agentDid={installQuery.data?.agent_id ?? "—"}
      agentVersion="—"
      alreadyGranted={granted}
      newlyRequested={[]}
      onCancel={() => navigate(`/agents-home`)}
      onApprove={() => navigate(`/agents/${installId}/trust`)}
    />
  );
}
