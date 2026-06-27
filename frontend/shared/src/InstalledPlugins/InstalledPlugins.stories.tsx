/**
 * InstalledPlugins stories — H09 Cluster A surface 1.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type InstalledPluginRow,
  InstalledPluginsSurface,
} from "./InstalledPluginsSurface.js";

const meta = { title: "H09/InstalledPlugins" } satisfies Meta;
export default meta;
type Story = StoryObj;

const PLUGINS: InstalledPluginRow[] = [
  {
    id: "p1",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    author: "did:theourgia:terra.example:agrippa-tools",
    description: "A full geomantic divination system.",
    status: "active",
  },
  {
    id: "p2",
    kind: "correspondence",
    name: "Decanic Correspondences",
    version: "v1.4.2",
    author: "did:theourgia:hermetica.org:decan-press",
    description: "The thirty-six decans with faces and rulerships.",
    status: "active",
  },
  {
    id: "p3",
    kind: "editor-block",
    name: "Runic Tabular Block",
    version: "v0.9.1",
    author: "did:theourgia:nine-worlds.example:vala",
    description: "Editor blocks for Elder Futhark tables.",
    status: "active",
  },
  {
    id: "p4",
    kind: "cipher",
    name: "Trithemian Cipher",
    version: "v1.0.3",
    author: "did:theourgia:steganographia.example:abbot",
    description: "Encode and decode steganographic ciphers.",
    status: "disabled",
  },
  {
    id: "p5",
    kind: "exporter",
    name: "Obsidian Vault Exporter",
    version: "v0.6.0",
    author: "did:theourgia:bridges.example:scribe",
    description: "Export entries to an Obsidian-compatible vault.",
    status: "active",
    tombstoned: true,
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <InstalledPluginsSurface plugins={PLUGINS} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <InstalledPluginsSurface plugins={[]} />
    </div>
  ),
};
