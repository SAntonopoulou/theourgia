/**
 * PluginUpdateDiff stories — H09 Cluster B surface 17 · FINAL.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { PluginUpdateDiffModal } from "./PluginUpdateDiffModal.js";

const meta = { title: "H09/PluginUpdateDiff" } satisfies Meta;
export default meta;
type Story = StoryObj;

const CHANGELOG = (
  <>
    <p style={{ margin: "0 0 8px" }}>
      <strong style={{ color: "var(--ink)" }}>v3.0.0</strong> — A
      major revision of the hour engine.
    </p>
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      <li>Recompute hours from the Swiss Ephemeris.</li>
      <li>Correct the twilight definition at high latitudes.</li>
      <li>Add a "current hour" widget for Today.</li>
    </ul>
  </>
);

const REMOVED_CAPS = [
  {
    label: "Read all your journal entries",
    wireKey: "read.entries",
    consequence: "No longer needed — the new engine is self-contained.",
  },
];

const NEW_CAPS = [
  {
    label: "Make outbound network requests",
    wireKey: "network.outbound",
    consequence:
      "Fetches ephemeris updates from the author's server.",
  },
];

const MIGRATIONS = [
  { id: "0004", label: "Add the new hour-cache table." },
  { id: "0005", label: "Backfill the twilight column." },
];

const BASE = {
  pluginName: "Planetary Hours",
  fromVersion: "v2.4.0",
  toVersion: "v3.0.0",
  changelog: CHANGELOG,
  migrationSteps: MIGRATIONS,
  onCancel: () => {},
  onApply: () => {},
};

export const NoNewCaps: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginUpdateDiffModal
        {...BASE}
        newCapabilities={[]}
        removedCapabilities={REMOVED_CAPS}
      />
    </div>
  ),
};

export const WithNewCaps: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginUpdateDiffModal
        {...BASE}
        newCapabilities={NEW_CAPS}
        removedCapabilities={REMOVED_CAPS}
      />
    </div>
  ),
};
