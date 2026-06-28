/**
 * TierPromotion — H10 A7 admin route (maintainer-signed).
 *
 * Promotes a plugin's tier. The maintainer picks the plugin, ticks
 * the manual + automatic checklist items, writes a justification,
 * and submits. The justification renders verbatim on the plugin's
 * public detail page.
 *
 * Mounted at /registry/promote/:pluginId.
 *
 * For v1, the plugin meta + checklist items are placeholders since
 * the registry doesn't yet expose a per-plugin "promotion candidate"
 * endpoint with audit status. When that lands, swap the static
 * checklist for real data.
 */

import {
  TierPromotionSurface,
  type TierPromotionChecklistItem,
  type PluginPickerMeta,
  useTopbar,
} from "@theourgia/shared";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { apiMethods } from "../data/api.js";

const PLACEHOLDER_CHECKLIST: TierPromotionChecklistItem[] = [
  {
    id: "auto_signed",
    label: "Latest version is signed + manifest verified",
    kind: "automatic",
    satisfied: true,
  },
  {
    id: "auto_no_advisories",
    label: "No open high-severity vulnerability advisories",
    kind: "automatic",
    satisfied: true,
  },
  {
    id: "manual_capabilities",
    label: "Capability declarations match plugin behaviour",
    kind: "manual",
    satisfied: false,
  },
  {
    id: "manual_review_history",
    label: "Reviewed in two consecutive versions without changes-requested",
    kind: "manual",
    satisfied: false,
  },
];

export function TierPromotionRoute() {
  const navigate = useNavigate();
  const { pluginId } = useParams<{ pluginId: string }>();

  useTopbar(() => ({
    title: "Tier promotion",
    subtitle: pluginId ?? "—",
  }));

  const promote = useMutation({
    mutationFn: async (payload: {
      justification: string;
      manualChecksTicked: readonly string[];
    }) => {
      if (!pluginId) throw new Error("missing pluginId");
      return apiMethods.promotePlugin(pluginId, {
        to_tier: "official",
        justification:
          payload.justification ||
          "Promoted after manual checklist + automatic gates verified.",
      });
    },
    onSuccess: () => {
      navigate("/registry");
    },
    onError: (err) => {
      console.error("TierPromotion · promote failed", err);
    },
  });

  const plugin: PluginPickerMeta = {
    name: pluginId ?? "—",
    version: "—",
    authorHandle: "—",
    inCommunityFor: "—",
  };

  return (
    <TierPromotionSurface
      plugin={plugin}
      checklist={PLACEHOLDER_CHECKLIST}
      onPromote={(payload) => promote.mutate(payload)}
    />
  );
}
