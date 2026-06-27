/**
 * BundleLibrary — admin route at ``/bundles``.
 */

import { useNavigate } from "react-router-dom";

import {
  type BundleRow,
  BundleLibrarySurface,
  useTopbar,
} from "@theourgia/shared";

const BUNDLES: BundleRow[] = [
  {
    id: "liber-777",
    name: "Liber 777 Tables",
    version: "v4.0.1",
    author: "did:theourgia:thelema.example:ordo-press",
    citation: "Liber 777",
    description:
      "The full qabalistic correspondence tables — sephiroth, paths, planets, elements, and tarot.",
    dataSummary: "137 correspondences across 32 columns",
  },
  {
    id: "decanic-faces",
    name: "Decanic Faces",
    version: "v1.4.2",
    author: "did:theourgia:hermetica.org:decan-press",
    citation: "Picatrix III.7",
    description:
      "The thirty-six decans with their Picatrix images and planetary rulerships.",
    dataSummary: "36 correspondences across 4 categories",
  },
  {
    id: "hekatean-epithets",
    name: "Hekatean Epithets",
    version: "v1.0.0",
    author: "did:theourgia:hellenismos.gr:trioditis",
    citation: "Greek Magical Papyri",
    description:
      "The voces and epithets of Hekate drawn from the PGM, with sources and translations.",
    dataSummary: "58 voces magicae with citations",
  },
  {
    id: "goetic-hierarchy",
    name: "Goetic Hierarchy",
    version: "v2.2.0",
    author: "did:theourgia:lemegeton.example:solomon",
    citation: "Ars Goetia",
    description:
      "The 72 spirits of the Ars Goetia — ranks, legions, offices, and their seals.",
    dataSummary: "72 beings across 9 ranks",
  },
];

export function BundleLibrary() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Bundles" }));

  return (
    <BundleLibrarySurface
      bundles={BUNDLES}
      onBrowseRegistry={() => navigate("/plugins/registry")}
      onBundleClick={(id) => navigate(`/bundles/${id}`)}
      onBundleAction={(id, action) => {
        // eslint-disable-next-line no-console
        console.info("[bundles] action", id, action);
      }}
    />
  );
}
