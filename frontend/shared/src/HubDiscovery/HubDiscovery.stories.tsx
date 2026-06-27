/**
 * HubDiscovery stories — H08 Cluster A surface 3.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type HubDiscoveryCard,
  HubDiscoverySurface,
} from "./HubDiscoverySurface.js";

const meta = { title: "H08/HubDiscovery" } satisfies Meta;
export default meta;
type Story = StoryObj;

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
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <HubDiscoverySurface hubs={HUBS} />
    </div>
  ),
};
