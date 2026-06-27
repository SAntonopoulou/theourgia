/**
 * BundleDiscard stories — H09 Cluster B surface 16.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { BundleDiscardModal } from "./BundleDiscardModal.js";

const meta = { title: "H09/BundleDiscard" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleDiscardModal
        sandboxLocalRowCount={108}
        mainVaultReferenceCount={3}
        onCancel={() => {}}
        onDiscard={() => {}}
      />
    </div>
  ),
};

export const NoReferences: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleDiscardModal
        sandboxLocalRowCount={42}
        mainVaultReferenceCount={0}
        onCancel={() => {}}
        onDiscard={() => {}}
      />
    </div>
  ),
};
