/**
 * BundleDetail stories — H09 Cluster B surface 11.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type BundleDataShape,
  BundleDetailSurface,
} from "./BundleDetailSurface.js";

const meta = { title: "H09/BundleDetail" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SHAPES: BundleDataShape[] = [
  {
    kind: "Correspondences",
    count: "36",
    sample: "Saturn-decan of Capricorn ↔ lead",
  },
  {
    kind: "Decan images",
    count: "36",
    sample: "“A man with red eyes, holding a sickle”",
  },
  {
    kind: "Face attributions",
    count: "36",
    sample: "1st face of Cancer ↔ Venus",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleDetailSurface
        name="Decanic Faces"
        author="did:theourgia:hermetica.org:decan-press"
        license="CC-BY-SA-4.0"
        citationSource="Picatrix III.7 (Warburg ed.)"
        installedDate="14 March 2026"
        shapes={SHAPES}
        referencesLine="9 entries and 4 magical beings reference content from this bundle."
        referenceCount={13}
      />
    </div>
  ),
};
