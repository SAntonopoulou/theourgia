/**
 * BundleInstallPreview stories — H09 Cluster B surface 12.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { BundleInstallPreviewModal } from "./BundleInstallPreviewModal.js";

const meta = { title: "H09/BundleInstallPreview" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SHAPES = [
  { count: "36", kind: "Decan correspondences" },
  { count: "36", kind: "Decan images" },
  { count: "36", kind: "Face attributions" },
];

const SAMPLES = [
  {
    glyph: "♈",
    title: "1st decan of Aries",
    detail: "Mars · “a man with red eyes, holding a sickle”",
  },
  {
    glyph: "♈",
    title: "2nd decan of Aries",
    detail: "Sun · “a woman in green”",
  },
  {
    glyph: "♉",
    title: "1st decan of Taurus",
    detail: "Mercury · “a naked man, an archer”",
  },
];

const BASE = {
  bundleName: "Decanic Faces",
  bundleVersion: "v1.5.0",
  citationSource: "Picatrix III.7",
  shapes: SHAPES,
  sampleCountLabel: "3 decans",
  samples: SAMPLES,
  licenseSpdx: "CC-BY-SA-4.0",
  licenseDescription:
    "Free to use and adapt with attribution; derivatives must share the same licence.",
  onCancel: () => {},
  onInstallSandbox: () => {},
  onInstallDirectly: () => {},
};

export const DataOnly: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleInstallPreviewModal {...BASE} />
    </div>
  ),
};

export const ShipsPlugin: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleInstallPreviewModal
        {...BASE}
        pluginDescription="The “decan-of-the-moment” widget."
      />
    </div>
  ),
};
