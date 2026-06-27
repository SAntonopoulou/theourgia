/**
 * HubMemberDashboard stories — H08 Cluster A surface 6.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type HubFeedDay,
  HubMemberDashboardSurface,
  type HubMySubmission,
} from "./HubMemberDashboardSurface.js";

const meta = { title: "H08/HubMemberDashboard" } satisfies Meta;
export default meta;
type Story = StoryObj;

const FEED_DAYS: HubFeedDay[] = [
  {
    label: "Today",
    items: [
      {
        id: "f-1",
        did: "did:theourgia:terra.example:diotima",
        kind: "working",
        time: "2h ago",
        preview:
          "Pushed: a dark-moon Deipnon at the shared stone. The lamp held all night.",
      },
      {
        id: "f-2",
        did: "did:theourgia:aurora.example:soror-aurora",
        kind: "divination",
        time: "5h ago",
        preview: "Pushed: a three-card draw on the hub's spring working.",
      },
    ],
  },
  {
    label: "Yesterday",
    items: [
      {
        id: "f-3",
        did: "did:theourgia:hearth.sophia.example:frater-h",
        kind: "publication",
        time: "18:40",
        preview:
          "Pushed: notes toward a shared egregore — for the hub library.",
      },
    ],
  },
];

const SUBMISSIONS: HubMySubmission[] = [
  { id: "s-1", title: "Dark-moon Deipnon", submitted: "2h ago", status: "pending" },
  {
    id: "s-2",
    title: "On the Ephesia Grammata",
    submitted: "3 days ago",
    status: "approved",
  },
  {
    id: "s-3",
    title: "A draft, reconsidered",
    submitted: "a week ago",
    status: "sent-back",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <HubMemberDashboardSurface
        hubName="The Crossroads Coven"
        monogram="Κ"
        tradition="Hellenic"
        role="officer"
        feedDays={FEED_DAYS}
        submissions={SUBMISSIONS}
        sharingState={{}}
      />
    </div>
  ),
};
