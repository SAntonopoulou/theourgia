/**
 * PluginAuthorProfile stories — H09 Cluster A surface 9.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type AuthorPluginCard,
  PluginAuthorProfileSurface,
} from "./PluginAuthorProfileSurface.js";

const meta = { title: "H09/PluginAuthorProfile" } satisfies Meta;
export default meta;
type Story = StoryObj;

const PLUGINS: AuthorPluginCard[] = [
  {
    id: "geomancy-workbench",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    tier: "official",
    description: "The complete geomantic system.",
  },
  {
    id: "decanic-correspondences",
    kind: "correspondence",
    name: "Decanic Correspondences",
    version: "v1.4.2",
    tier: "official",
    description: "The thirty-six decans with faces.",
  },
  {
    id: "roman-festival-calendar",
    kind: "calendar",
    name: "Roman Festival Calendar",
    version: "v1.0.0",
    tier: "official",
    description: "The Roman religious calendar.",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginAuthorProfileSurface
        displayName="Agrippa Tools"
        monogram="Α"
        did="did:theourgia:terra.example:agrippa-tools"
        about={
          <p style={{ margin: 0 }}>
            A small workshop building careful, well-sourced
            divination and correspondence plugins.
          </p>
        }
        homepage="terra.example/agrippa-tools"
        pluginCount={3}
        firstPublishedLabel="Nov 2025"
        lastActivityLabel="2 days ago"
        licenseLabel="CC-BY-SA-4.0"
        plugins={PLUGINS}
      />
    </div>
  ),
};
