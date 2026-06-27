/**
 * SandboxPromote stories — H09 Cluster B surface 15.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { SandboxPromoteModal } from "./SandboxPromoteModal.js";

const meta = { title: "H09/SandboxPromote" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <SandboxPromoteModal
        shapes={[
          { kind: "Decan correspondences", count: "36" },
          { kind: "Decan images", count: "36" },
          { kind: "Face attributions", count: "36" },
        ]}
        existingReferencesLabel="3 entries"
        onCancel={() => {}}
        onPromote={() => {}}
      />
    </div>
  ),
};
