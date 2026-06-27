/**
 * RegistryBrowser stories — H09 Cluster A surface 7.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type RegistryPluginCard,
  RegistryBrowserSurface,
} from "./RegistryBrowserSurface.js";

const meta = { title: "H09/RegistryBrowser" } satisfies Meta;
export default meta;
type Story = StoryObj;

const CARDS: RegistryPluginCard[] = [
  {
    id: "geomancy-workbench",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    tier: "official",
    author: "did:theourgia:terra.example:agrippa-tools",
    description: "The complete geomantic system.",
    updatedRank: 2,
    addedRank: 5,
  },
  {
    id: "vedic-correspondences",
    kind: "correspondence",
    name: "Vedic Correspondences",
    version: "v1.2.0",
    tier: "community",
    author: "did:theourgia:jyotisha.example:nakshatra",
    description: "Grahas, nakshatras, and their associations.",
    updatedRank: 4,
    addedRank: 18,
  },
  {
    id: "goetic-sigil-importer",
    kind: "editor-block",
    name: "Goetic Sigil Importer",
    version: "v0.3.0",
    tier: "unverified",
    author: "did:theourgia:unverified.example:anon-scribe",
    description: "Imports the 72 Goetic seals as editor blocks.",
    updatedRank: 2,
    addedRank: 2,
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RegistryBrowserSurface cards={CARDS} />
    </div>
  ),
};
