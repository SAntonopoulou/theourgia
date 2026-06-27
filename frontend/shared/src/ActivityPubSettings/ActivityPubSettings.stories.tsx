/**
 * ActivityPubSettings stories — H08 Cluster B surface 16.
 * Master switch OFF by default; first activation requires
 * --danger confirm.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ActivityPubSettingsSurface } from "./ActivityPubSettingsSurface.js";

const meta = { title: "H08/ActivityPubSettings" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Disabled: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <ActivityPubSettingsSurface
        webFingerHandle="@aspasia@hearth.sophia.example"
      />
    </div>
  ),
};

export const Enabled: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <ActivityPubSettingsSurface
        webFingerHandle="@aspasia@hearth.sophia.example"
        initial={{ enabled: true }}
      />
    </div>
  ),
};
