/**
 * PluginDetail stories — H09 Cluster A surface 2.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { PluginDetailSurface } from "./PluginDetailSurface.js";

const meta = { title: "H09/PluginDetail" } satisfies Meta;
export default meta;
type Story = StoryObj;

const BASE = {
  name: "Decanic Correspondences",
  version: "v1.4.2",
  kind: "correspondence" as const,
  status: "active" as const,
  author: "did:theourgia:hermetica.org:decan-press",
  license: "CC-BY-SA-4.0",
  homepage: "hermetica.org/decans",
  compatibleVersionRange: "Theourgia ≥ 4.0.0",
  description: (
    <>
      <p style={{ margin: "0 0 10px" }}>
        The thirty-six decans with their Picatrix images.
      </p>
      <p style={{ margin: 0 }}>Adds a decan reference panel.</p>
    </>
  ),
  capabilities: [
    {
      label: "Read your magical beings",
      wireKey: "read.entities",
      consequence: "Reads entities to attach correspondences.",
    },
    {
      label: "Add a divination system",
      wireKey: "ui.divination.add-system",
      consequence: "Registers a new divination method.",
    },
  ],
  extensionPoints: [
    { label: "Editor blocks (1)", detail: "'decan-reference'" },
  ],
  migrations: [
    { id: "0001", label: "Seeded the 36 decans.", date: "12 Mar 2026" },
  ],
  storageFootprint: "1.8 MB on disk — 36 decan records.",
};

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginDetailSurface {...BASE} />
    </div>
  ),
};

export const WithUpdateAvailable: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginDetailSurface {...BASE} updateAvailableVersion="v1.5.0" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginDetailSurface {...BASE} status="disabled" />
    </div>
  ),
};
