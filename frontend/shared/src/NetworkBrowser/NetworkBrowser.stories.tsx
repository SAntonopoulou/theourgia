/**
 * NetworkBrowser stories — H08 Cluster A surface 2.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  NetworkBrowserSurface,
  type PeerInstance,
} from "./NetworkBrowserSurface.js";

const meta = { title: "H08/NetworkBrowser" } satisfies Meta;
export default meta;
type Story = StoryObj;

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

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <NetworkBrowserSurface peers={PEERS} />
    </div>
  ),
};
