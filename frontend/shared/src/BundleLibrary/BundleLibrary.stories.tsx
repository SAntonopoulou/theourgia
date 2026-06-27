/**
 * BundleLibrary stories — H09 Cluster B surface 10.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type BundleRow,
  BundleLibrarySurface,
} from "./BundleLibrarySurface.js";

const meta = { title: "H09/BundleLibrary" } satisfies Meta;
export default meta;
type Story = StoryObj;

const BUNDLES: BundleRow[] = [
  {
    id: "liber-777",
    name: "Liber 777 Tables",
    version: "v4.0.1",
    author: "did:theourgia:thelema.example:ordo-press",
    citation: "Liber 777",
    description: "The full qabalistic correspondence tables.",
    dataSummary: "137 correspondences across 32 columns",
  },
  {
    id: "decanic-faces",
    name: "Decanic Faces",
    version: "v1.4.2",
    author: "did:theourgia:hermetica.org:decan-press",
    citation: "Picatrix III.7",
    description: "The thirty-six decans with their Picatrix images.",
    dataSummary: "36 correspondences across 4 categories",
  },
  {
    id: "hekatean-epithets",
    name: "Hekatean Epithets",
    version: "v1.0.0",
    author: "did:theourgia:hellenismos.gr:trioditis",
    citation: "Greek Magical Papyri",
    description:
      "The voces and epithets of Hekate drawn from the PGM.",
    dataSummary: "58 voces magicae with citations",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleLibrarySurface bundles={BUNDLES} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <BundleLibrarySurface bundles={[]} />
    </div>
  ),
};
