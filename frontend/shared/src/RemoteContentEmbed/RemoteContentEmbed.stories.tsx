/**
 * RemoteContentEmbed stories — H08 Cluster B surface 18. Three
 * states: resolvable / loading / unresolvable (citation preserved
 * even when the origin post is gone).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { RemoteContentEmbed } from "./RemoteContentEmbed.js";

const meta = { title: "H08/RemoteContentEmbed" } satisfies Meta;
export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 28,
      maxWidth: 600,
      background: "var(--bg)",
    }}
  >
    {children}
  </div>
);

export const Resolvable: Story = {
  render: () => (
    <Frame>
      <RemoteContentEmbed
        state="resolvable"
        authorName="Frater Lux"
        authorHandle="@frater-lux@thelema.example"
        instance="thelema.example"
        authorInitial="F"
        body="Kept the Deipnon at the crossroads stone tonight — bread, an egg, and the sweepings of the house left at the third lamp. The dark moon felt unusually still."
        postedAtLabel="27 Jun 2026 · 21:14"
        originalHref="https://thelema.example/users/frater-lux/notes/abc"
      />
    </Frame>
  ),
};

export const Loading: Story = {
  render: () => (
    <Frame>
      <RemoteContentEmbed state="loading" />
    </Frame>
  ),
};

export const Unresolvable: Story = {
  render: () => (
    <Frame>
      <RemoteContentEmbed
        state="unresolvable"
        authorHandle="@orphic@pleroma.example"
        instance="pleroma.example"
      />
    </Frame>
  ),
};
