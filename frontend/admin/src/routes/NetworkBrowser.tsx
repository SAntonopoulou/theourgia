/**
 * NetworkBrowser — admin route at ``/networks/peers``.
 *
 * Renders the H08 §S3 Cluster A surface 2 against fixture data
 * until the Phase 12 federation endpoints land. The fixtures
 * mirror the .dc.html demo state — six rows (1 local + 5 peers
 * across the four handshake states).
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * /api/v1/federation/peers — replaces PEERS.
 *   * /api/v1/federation/peers/{domain}/handshake — kebab → Refresh.
 *   * /api/v1/federation/peers/{domain}/block — kebab → Block.
 *   * /api/v1/federation/blocklist-subscription — Configure CTA
 *     opens a settings panel (separate surface, design-gated).
 */

import {
  NetworkBrowserSurface,
  type PeerInstance,
  useTopbar,
} from "@theourgia/shared";

const PEERS: PeerInstance[] = [
  {
    domain: "hearth.sophia.example",
    tradition: "Hellenic · Thelemic",
    handshake: "successful",
    heartbeat: "just now",
    isLocal: true,
  },
  {
    domain: "aurora.example",
    tradition: "Hermetic",
    handshake: "successful",
    heartbeat: "4 minutes ago",
    isLocal: false,
  },
  {
    domain: "terra.example",
    tradition: "Folk",
    handshake: "successful",
    heartbeat: "11 minutes ago",
    isLocal: false,
  },
  {
    domain: "thelema.example",
    tradition: "Thelemic",
    handshake: "successful",
    heartbeat: "an hour ago",
    isLocal: false,
  },
  {
    domain: "newcomer.example",
    tradition: "Independent",
    handshake: "pending",
    heartbeat: "never",
    isLocal: false,
  },
  {
    domain: "closed.example",
    tradition: "Unknown",
    handshake: "refused",
    heartbeat: "3 days ago",
    isLocal: false,
  },
  {
    domain: "spam.example",
    tradition: "Unknown",
    handshake: "blocked",
    heartbeat: "never",
    isLocal: false,
  },
];

const TRADITIONS = ["Hellenic", "Thelemic", "Hermetic", "Folk"];

export function NetworkBrowser() {
  useTopbar(() => ({ title: "Network browser" }));

  return (
    <NetworkBrowserSurface
      peers={PEERS}
      traditions={TRADITIONS}
      blocklistSubscribed={false}
      onConfigureBlocklist={() => {
        // TODO Phase 12 — open the blocklist subscription settings
        // panel (separate surface, design-gated).
        // eslint-disable-next-line no-console
        console.info("[network-browser] configure blocklist");
      }}
      onPeerAction={(domain) => {
        // TODO Phase 12 — render the kebab menu (Open / Refresh
        // handshake / Block instance) per the .dc.html.
        // eslint-disable-next-line no-console
        console.info("[network-browser] peer action", domain);
      }}
    />
  );
}
