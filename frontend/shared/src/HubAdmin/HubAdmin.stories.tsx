/**
 * HubAdminDashboard stories — H08 Cluster A surface 4.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type CurationItem,
  HubAdminDashboardSurface,
  type HubMemberRow,
  type HubPublicFaceDraft,
} from "./HubAdminDashboardSurface.js";

const meta = { title: "H08/HubAdminDashboard" } satisfies Meta;
export default meta;
type Story = StoryObj;

const MEMBERS: HubMemberRow[] = [
  {
    initial: "A",
    name: "Soror Aurora",
    did: "did:theourgia:aurora.example:soror-aurora",
    role: "admin",
    activity: "today",
  },
  {
    initial: "H",
    name: "Frater Hermes",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    role: "officer",
    activity: "2 days ago",
  },
  {
    initial: "Δ",
    name: "Diotima",
    did: "did:theourgia:terra.example:diotima",
    role: "moderator",
    activity: "4 days ago",
  },
];

const CURATION: CurationItem[] = [
  {
    id: "cur-1",
    did: "did:theourgia:terra.example:diotima",
    kind: "entry",
    submitted: "2 hours ago",
    preview: "A working at the dark moon — the air changed.",
    status: "pending",
  },
  {
    id: "cur-2",
    did: "did:theourgia:hearth.sophia.example:frater-h",
    kind: "divination",
    submitted: "yesterday",
    preview: "A three-card draw on the timing of the Deipnon.",
    status: "pending",
  },
  {
    id: "cur-3",
    did: "did:theourgia:aurora.example:soror-aurora",
    kind: "publication",
    submitted: "3 days ago",
    preview: "On the Ephesia Grammata — a short essay.",
    status: "approved",
    approvedAt: "2 days ago",
  },
];

const PUBLIC_FACE: HubPublicFaceDraft = {
  motto: "Tending Hekate's lamp, together.",
  description:
    "A hub for practitioners keeping the crossroads. We share workings, compare notes on the Deipnon, and tend a shared egregore.",
  bannerUrl: null,
};

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <HubAdminDashboardSurface
        hubName="The Crossroads Coven"
        members={MEMBERS}
        curation={CURATION}
        publicFace={PUBLIC_FACE}
        analyticsOptIn="opt-in"
      />
    </div>
  ),
};
