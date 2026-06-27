/**
 * MyNetworks — admin route at ``/networks`` (and ``/hubs`` legacy alias).
 *
 * Renders the H08 §S3 Cluster A surface 1 against fixture data
 * until the Phase 12 federation endpoints land. The fixtures mirror
 * the .dc.html's demo state — the "populated" preview — so the
 * route looks the same as the design exit.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * /api/v1/hubs/memberships — replaces the HUBS fixture.
 *   * /api/v1/hubs/invitations — replaces the INVITES fixture.
 *   * Accept / Decline call /api/v1/hubs/{id}/invitations/{id}/accept
 *     and /decline respectively.
 */

import { useNavigate } from "react-router-dom";

import {
  type HubInvitationCard,
  type HubMembershipCard,
  MyNetworksSurface,
  useTopbar,
} from "@theourgia/shared";

const HUBS: HubMembershipCard[] = [
  {
    hubId: "hub-crossroads-coven",
    hubName: "The Crossroads Coven",
    tradition: "Hellenic",
    role: "officer",
    lastActivity: "2 days ago",
    initial: "Κ",
    initialBg: "var(--network-soft)",
  },
  {
    hubId: "hub-silver-star-lodge",
    hubName: "Lodge of the Silver Star",
    tradition: "Thelemic",
    role: "member",
    lastActivity: "5 days ago",
    initial: "A",
  },
  {
    hubId: "hub-hedgerow-study",
    hubName: "Hedgerow Study Group",
    tradition: "Folk",
    role: "admin",
    lastActivity: "9 days ago",
    initial: "H",
  },
];

const INVITES: HubInvitationCard[] = [
  {
    hubId: "inv-hermetic-circle",
    hubName: "The Hermetic Circle",
    invitedBy: "did:theourgia:aurora.example:soror-aurora",
    note:
      "We read your essay on the crossroads — would be glad to have you.",
    initial: "Ⲏ",
  },
  {
    hubId: "inv-geomancers-table",
    hubName: "Geomancers' Table",
    invitedBy: "did:theourgia:terra.example:frater-v",
    initial: "G",
  },
];

export function MyNetworks() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "My networks" }));

  return (
    <MyNetworksSurface
      hubs={HUBS}
      invites={INVITES}
      onDiscover={() => navigate("/networks/discover")}
      onOpenHub={(hubId) => navigate(`/networks/hubs/${hubId}`)}
      onAcceptInvite={(hubId) => {
        // TODO Phase 12 — POST /api/v1/hubs/{id}/invitations/{id}/accept.
        // For now, log so the wiring is visible while the route
        // ships against fixtures.
        // eslint-disable-next-line no-console
        console.info("[my-networks] accept invitation", hubId);
      }}
      onDeclineInvite={(hubId) => {
        // TODO Phase 12 — POST /api/v1/hubs/{id}/invitations/{id}/decline.
        // eslint-disable-next-line no-console
        console.info("[my-networks] decline invitation", hubId);
      }}
    />
  );
}
