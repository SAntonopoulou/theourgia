/**
 * RegistryPluginDetail stories — H09 Cluster A surface 8.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { RegistryPluginDetailSurface } from "./RegistryPluginDetailSurface.js";

const meta = { title: "H09/RegistryPluginDetail" } satisfies Meta;
export default meta;
type Story = StoryObj;

const BASE = {
  name: "Geomancy Workbench",
  version: "v2.1.0",
  kind: "divination" as const,
  author: "did:theourgia:terra.example:agrippa-tools",
  license: "CC-BY-SA-4.0",
  homepage: "terra.example/geomancy",
  description: (
    <p style={{ margin: 0 }}>
      The complete geomantic divination system. Adds a divination
      method and a figure-reference panel.
    </p>
  ),
  capabilities: [
    {
      label: "Read all your journal entries",
      wireKey: "read.entries",
      consequence: "Reads entries to suggest geomantic context.",
    },
    {
      label: "Add a divination system",
      wireKey: "ui.divination.add-system",
      consequence: "Registers geomancy in the Divination workbench.",
    },
  ],
  extensionPoints: [
    { label: "Divination systems (1)", detail: "'geomancy'" },
  ],
  versions: [
    {
      version: "v2.1.0",
      date: "2 days ago",
      notes: "Added house-chart derivation.",
    },
    {
      version: "v2.0.0",
      date: "6 weeks ago",
      notes: "Rewrote the judge algorithm.",
    },
  ],
};

export const Official: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RegistryPluginDetailSurface {...BASE} tier="official" />
    </div>
  ),
};

export const Unverified: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RegistryPluginDetailSurface
        {...BASE}
        tier="unverified"
        author="did:theourgia:unverified.example:anon-scribe"
        name="Goetic Sigil Importer"
      />
    </div>
  ),
};

export const Tombstoned: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RegistryPluginDetailSurface
        {...BASE}
        tier="community"
        name="Grimoire PDF Exporter"
        tombstoneReason="No longer maintained — superseded by the Decanic Correspondences bundle. Existing installs keep working."
      />
    </div>
  ),
};
