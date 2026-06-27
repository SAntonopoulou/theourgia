/**
 * SandboxBrowser stories — H09 Cluster B surface 13.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type SandboxRow,
  SandboxBrowserSurface,
} from "./SandboxBrowserSurface.js";

const meta = { title: "H09/SandboxBrowser" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SANDBOXES: SandboxRow[] = [
  {
    id: "sb-decanic-faces",
    label: "Decanic Faces preview",
    origin: "Decanic Faces v1.5.0",
    createdAgo: "4 days ago",
    expiresLabel: "Expires in 26 days",
  },
  {
    id: "sb-vedic",
    label: "Trying the Vedic correspondences",
    origin: "Vedic Correspondences v1.2.0",
    createdAgo: "yesterday",
    expiresLabel: "Expires in 29 days",
  },
  {
    id: "sb-goetic",
    label: "Goetic Hierarchy preview",
    origin: "Goetic Hierarchy v2.2.0",
    createdAgo: "3 weeks ago",
    expiresLabel: "Expires in 2 days",
    expiryNearby: true,
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <SandboxBrowserSurface sandboxes={SANDBOXES} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <SandboxBrowserSurface sandboxes={[]} />
    </div>
  ),
};
