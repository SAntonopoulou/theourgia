/**
 * MyNetworks stories — H08 Cluster A surface 1.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type HubInvitationCard,
  type HubMembershipCard,
  MyNetworksSurface,
} from "./MyNetworksSurface.js";

const meta = { title: "H08/MyNetworks" } satisfies Meta;
export default meta;
type Story = StoryObj;

const HUBS: HubMembershipCard[] = [
  {
    hubId: "hub-1",
    hubName: "The Crossroads Coven",
    tradition: "Hellenic",
    role: "officer",
    lastActivity: "2 days ago",
    initial: "Κ",
    initialBg: "var(--network-soft)",
  },
  {
    hubId: "hub-2",
    hubName: "Lodge of the Silver Star",
    tradition: "Thelemic",
    role: "member",
    lastActivity: "5 days ago",
    initial: "A",
  },
];

const INVITES: HubInvitationCard[] = [
  {
    hubId: "inv-1",
    hubName: "The Hermetic Circle",
    invitedBy: "did:theourgia:aurora.example:soror-aurora",
    note: "We read your essay on the crossroads — would be glad to have you.",
    initial: "Ⲏ",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <MyNetworksSurface hubs={HUBS} invites={INVITES} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <MyNetworksSurface hubs={[]} invites={[]} />
    </div>
  ),
};
