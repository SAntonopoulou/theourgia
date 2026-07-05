/**
 * NetworkBrowser — admin route at ``/networks/peers``.
 *
 * Peer-instance federation listing. The backend endpoint
 * (/api/v1/federation/peers) is not yet built — this route renders
 * the empty state with an honest "no peers known yet" message
 * instead of demo fixtures pretending peers exist. When the
 * backend lands, swap the empty array for a useQuery call.
 */

import {
  NetworkBrowserSurface,
  type PeerInstance,
  useTopbar,
} from "@theourgia/shared";

export function NetworkBrowser() {
  useTopbar(() => ({
    title: "Network browser",
    subtitle: "Federated instances your vault has handshaken with",
  }));

  // Empty until /api/v1/federation/peers ships. The surface renders
  // its own empty state; we pass no peers instead of pretending.
  const peers: PeerInstance[] = [];

  return (
    <NetworkBrowserSurface
      peers={peers}
      traditions={[]}
      blocklistSubscribed={false}
      onConfigureBlocklist={() => {
        // Blocklist subscription settings surface is a Phase-12
        // follow-up. Deliberately no-op instead of pretending to
        // open something.
      }}
      onPeerAction={() => {
        // Peer kebab actions (Open / Refresh handshake / Block)
        // wire when the peers endpoint lands.
      }}
    />
  );
}
