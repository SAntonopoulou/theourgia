/**
 * HubPublicFace stories — H08 Cluster A surface 5.
 * Public-facing route; no VaultNav.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type HubFeaturedItem,
  HubPublicFaceSurface,
} from "./HubPublicFaceSurface.js";

const meta = { title: "H08/HubPublicFace" } satisfies Meta;
export default meta;
type Story = StoryObj;

const FEATURED: HubFeaturedItem[] = [
  {
    id: "feat-1",
    title: "On the Ephesia Grammata",
    author: "Soror Aurora",
    href: "/reader/aurora/ephesia-grammata",
  },
  {
    id: "feat-2",
    title: "Keeping the Deipnon",
    author: "Diotima",
  },
];

const BASE = {
  hubName: "The Crossroads Coven",
  motto: "Tending Hekate's lamp, together.",
  traditions: ["Hellenic"],
  establishedAt: "March 2024",
  monogram: "Κ",
  about: "A hub for practitioners keeping the crossroads.",
  featured: FEATURED,
};

export const Anonymous_OpenWithApproval: Story = {
  render: () => (
    <div style={{ background: "var(--bg)" }}>
      <HubPublicFaceSurface
        {...BASE}
        policy="open-with-approval"
        viewer="anonymous"
      />
    </div>
  ),
};

export const Member: Story = {
  render: () => (
    <div style={{ background: "var(--bg)" }}>
      <HubPublicFaceSurface {...BASE} policy="public" viewer="member" />
    </div>
  ),
};

export const PrivateInvitationOnly: Story = {
  render: () => (
    <div style={{ background: "var(--bg)" }}>
      <HubPublicFaceSurface
        {...BASE}
        policy="private"
        viewer="anonymous"
      />
    </div>
  ),
};
