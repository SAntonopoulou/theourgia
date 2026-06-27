/**
 * RegistryBrowser — admin route at ``/plugins/registry``.
 */

import { useNavigate } from "react-router-dom";

import {
  type RegistryPluginCard,
  RegistryBrowserSurface,
  useTopbar,
} from "@theourgia/shared";

const CARDS: RegistryPluginCard[] = [
  {
    id: "geomancy-workbench",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    tier: "official",
    author: "did:theourgia:terra.example:agrippa-tools",
    description:
      "The complete geomantic system — sixteen figures, shield and house charts, and judge derivation.",
    updatedRank: 2,
    addedRank: 5,
  },
  {
    id: "liber-777-tables",
    kind: "correspondence",
    name: "Liber 777 Tables",
    version: "v4.0.1",
    tier: "official",
    author: "did:theourgia:thelema.example:ordo-press",
    description:
      "The full Liber 777 correspondence tables — qabalistic, planetary, elemental, and tarot attributions.",
    updatedRank: 9,
    addedRank: 40,
  },
  {
    id: "vedic-correspondences",
    kind: "correspondence",
    name: "Vedic Correspondences",
    version: "v1.2.0",
    tier: "community",
    author: "did:theourgia:jyotisha.example:nakshatra",
    description:
      "Grahas, nakshatras, and their associations — herbs, gems, mantras, and deities.",
    updatedRank: 4,
    addedRank: 18,
  },
  {
    id: "trithemian-cipher",
    kind: "cipher",
    name: "Trithemian Cipher",
    version: "v1.0.3",
    tier: "community",
    author: "did:theourgia:steganographia.example:abbot",
    description:
      "Encode and decode steganographic ciphers from the Polygraphia and Steganographia.",
    updatedRank: 30,
    addedRank: 30,
  },
  {
    id: "goetic-sigil-importer",
    kind: "editor-block",
    name: "Goetic Sigil Importer",
    version: "v0.3.0",
    tier: "unverified",
    author: "did:theourgia:unverified.example:anon-scribe",
    description:
      "Imports the 72 Goetic seals as editor blocks. Author not yet reviewed.",
    updatedRank: 2,
    addedRank: 2,
  },
  {
    id: "coptic-calendar",
    kind: "calendar",
    name: "Coptic Calendar",
    version: "v1.1.0",
    tier: "unverified",
    author: "did:theourgia:kemet.example:wabt",
    description:
      "The Coptic liturgical and agricultural calendar with feast days and Nile markers.",
    updatedRank: 7,
    addedRank: 11,
  },
];

export function RegistryBrowser() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Registry" }));

  return (
    <RegistryBrowserSurface
      cards={CARDS}
      onBreadcrumbHome={() => navigate("/plugins")}
      onView={(id) => navigate(`/plugins/registry/${id}`)}
    />
  );
}
