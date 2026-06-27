/**
 * PrivateViewers stories — H08 Cluster A surface 11. Covers the
 * active + revoked list, the empty state, and the New viewer modal
 * default (tag-scoped + signed-link delivery).
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  PrivateViewersSurface,
  type PrivateViewerRow,
} from "./PrivateViewersSurface.js";

const meta = { title: "H08/PrivateViewers" } satisfies Meta;
export default meta;
type Story = StoryObj;

const VIEWERS: PrivateViewerRow[] = [
  {
    id: "v-aspasia",
    label: "Student — Aspasia",
    handle: "aspasia@example.com",
    lastUsed: "2 days ago",
    scopeKind: "tag",
    initial: "A",
  },
  {
    id: "v-frater",
    label: "Working partner — V.",
    handle: "@frater-v@terra.example",
    lastUsed: "a week ago",
    scopeKind: "kind",
    initial: "V",
  },
  {
    id: "v-old",
    label: "Former student",
    handle: "old@example.com",
    lastUsed: "3 months ago",
    scopeKind: "full",
    initial: "F",
    revoked: true,
    revokedAt: "12 Apr",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PrivateViewersSurface viewers={VIEWERS} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PrivateViewersSurface viewers={[]} />
    </div>
  ),
};
