/**
 * HubDiscovery — admin route at ``/networks/discover``.
 *
 * Renders the H08 §S3 Cluster A surface 3 against fixtures. The
 * four-hub demo set mirrors the .dc.html (Public ×2, Open-with-
 * approval ×1, Private ×1) so the CTA matrix is visible at the
 * design exit.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/hubs?q=&tradition=&sort=alpha|recent — replaces
 *     the HUBS fixture. The plan locks: NEVER sort by popularity.
 *   * POST /api/v1/hubs/{id}/invitations — fires when the
 *     practitioner clicks "Request to join" on a public or open-
 *     with-approval hub.
 */

import { useNavigate } from "react-router-dom";

import {
  type HubDiscoveryCard,
  HubDiscoverySurface,
  useTopbar,
} from "@theourgia/shared";

const HUBS: HubDiscoveryCard[] = [
  {
    id: "hub-crossroads",
    slug: "crossroads-coven",
    name: "The Crossroads Coven",
    motto: "Tending Hekate's lamp, together.",
    traditions: ["Hellenic"],
    policy: "public",
    memberCount: 34,
    isMember: false,
    bannerStyle:
      "linear-gradient(120deg,var(--network-soft),var(--bg-sunk))",
  },
  {
    id: "hub-silver-star",
    slug: "silver-star",
    name: "Lodge of the Silver Star",
    motto: "Do what thou wilt shall be the whole of the Law.",
    traditions: ["Thelemic", "Ceremonial"],
    policy: "open-with-approval",
    memberCount: 112,
    isMember: true,
    bannerStyle:
      "linear-gradient(120deg,rgba(199,162,76,.16),var(--bg-sunk))",
  },
  {
    id: "hub-hedgerow",
    slug: "hedgerow",
    name: "Hedgerow Study Group",
    motto: "The old ways, read closely.",
    traditions: ["Folk"],
    policy: "public",
    memberCount: 18,
    isMember: false,
    bannerStyle:
      "linear-gradient(120deg,rgba(110,142,99,.18),var(--bg-sunk))",
  },
  {
    id: "hub-hermetic",
    slug: "hermetic-circle",
    name: "The Hermetic Circle",
    motto: "As above, so below — and we compare notes.",
    traditions: ["Hermetic"],
    policy: "private",
    memberCount: 27,
    isMember: false,
    bannerStyle:
      "linear-gradient(120deg,rgba(169,138,192,.16),var(--bg-sunk))",
  },
];

export function HubDiscovery() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Discover hubs" }));

  return (
    <HubDiscoverySurface
      hubs={HUBS}
      onRequestJoin={(hubId) => {
        // TODO Phase 12 — POST /api/v1/hubs/{id}/invitations to
        // emit the Invite envelope. The receiving hub's admin
        // sees it in their curation queue.
        // eslint-disable-next-line no-console
        console.info("[hub-discovery] request to join", hubId);
        navigate(`/networks/hubs/${hubId}`);
      }}
    />
  );
}
