/**
 * PushToHub stories — H08 Cluster A surface 15. Network entry
 * picks hubs; sealed entry blocked with --seal callout.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  PushToHubModal,
  type PthHubOption,
} from "./PushToHubModal.js";

const meta = { title: "H08/PushToHub" } satisfies Meta;
export default meta;
type Story = StoryObj;

const HUBS: PthHubOption[] = [
  {
    id: "h-coven",
    name: "The Crossroads Coven",
    roleLabel: "an officer",
    autoCurates: false,
  },
  {
    id: "h-hedgerow",
    name: "Hedgerow Study Group",
    roleLabel: "an admin",
    autoCurates: true,
  },
  {
    id: "h-hermetic",
    name: "The Hermetic Circle",
    roleLabel: "a member",
    autoCurates: false,
  },
];

const BASE = {
  entryTitle: "Dark-moon Deipnon at the shared stone",
  hubs: HUBS,
  onCancel: () => {},
  onPush: () => {},
};

export const NetworkEntry: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PushToHubModal entryKind="network" {...BASE} />
    </div>
  ),
};

export const SealedEntryBlocked: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PushToHubModal entryKind="sealed" {...BASE} />
    </div>
  ),
};
