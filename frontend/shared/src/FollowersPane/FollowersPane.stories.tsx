/**
 * FollowersPane stories — H08 Cluster B surface 17.
 * No engagement metrics beyond the count.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type FollowerRow,
  FollowersPaneSurface,
  type PendingFollowRow,
} from "./FollowersPaneSurface.js";

const meta = { title: "H08/FollowersPane" } satisfies Meta;
export default meta;
type Story = StoryObj;

const FOLLOWERS: FollowerRow[] = [
  {
    id: "f-vesper",
    name: "Lucia Vesper",
    handle: "@lvesper@thelema.example",
    tradition: "Thelemic",
    since: "4 days",
    initial: "L",
    tone: 0,
  },
  {
    id: "f-hedge",
    name: "Hedge & Hollow",
    handle: "@hedge@folkcraft.social",
    tradition: "Folk",
    since: "1 week",
    initial: "H",
    tone: 1,
  },
  {
    id: "f-owl",
    name: "The Owl Library",
    handle: "@owllib@books.bookwyrm.social",
    tradition: "Scholarly",
    since: "2 months",
    initial: "T",
    tone: 2,
  },
];

const PENDING: PendingFollowRow[] = [
  {
    id: "p-orphic",
    name: "orphic.flame",
    handle: "@orphic@pleroma.example",
    initial: "O",
    tone: 2,
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <FollowersPaneSurface followers={FOLLOWERS} pending={PENDING} />
    </div>
  ),
};

export const NoPending: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <FollowersPaneSurface followers={FOLLOWERS} pending={[]} />
    </div>
  ),
};
