/**
 * PluginCapabilityReview stories — H09 Cluster A surface 3 ·
 * THE worked example.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { PluginCapabilityReviewModal } from "./PluginCapabilityReviewModal.js";

const meta = { title: "H09/PluginCapabilityReview" } satisfies Meta;
export default meta;
type Story = StoryObj;

const BASE_CAPS = [
  {
    label: "Read all your journal entries",
    wireKey: "read.entries",
    consequence:
      "The plugin can read every entry, but cannot modify or delete them.",
  },
  {
    label: "Read your magical beings",
    wireKey: "read.entities",
    consequence:
      "It reads the entities in your vault to attach correspondences.",
  },
  {
    label: "Add a divination system",
    wireKey: "ui.divination.add-system",
    consequence:
      "Registers a new divination method in the Divination workbench.",
  },
  {
    label: "Apply database migrations",
    wireKey: "db.migrations",
    consequence:
      "Creates the tables it needs at install and update.",
  },
];

const NEW_CAPS = [
  {
    label: "Make outbound network requests",
    wireKey: "network.outbound",
    consequence:
      "The new version fetches an ephemeris table from the author's server.",
  },
];

export const Install: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginCapabilityReviewModal
        pluginName="Geomancy Workbench"
        authorDid="did:theourgia:terra.example:agrippa-tools"
        capabilities={BASE_CAPS}
        scenario="install"
        onCancel={() => {}}
        onInstall={() => {}}
      />
    </div>
  ),
};

export const Update: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginCapabilityReviewModal
        pluginName="Geomancy Workbench"
        authorDid="did:theourgia:terra.example:agrippa-tools"
        capabilities={BASE_CAPS}
        newlyRequestedCapabilities={NEW_CAPS}
        scenario="update"
        onCancel={() => {}}
        onInstall={() => {}}
      />
    </div>
  ),
};

export const Tier3Unverified: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginCapabilityReviewModal
        pluginName="Goetic Sigil Importer"
        authorDid="did:theourgia:unverified.example:anon-scribe"
        capabilities={BASE_CAPS}
        scenario="tier3"
        onCancel={() => {}}
        onInstall={() => {}}
      />
    </div>
  ),
};
