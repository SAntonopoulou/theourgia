/**
 * PluginAuthorProfile — admin route at ``/plugins/authors/:did``.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type AuthorPluginCard,
  PluginAuthorProfileSurface,
  useTopbar,
} from "@theourgia/shared";

const PLUGINS: AuthorPluginCard[] = [
  {
    id: "geomancy-workbench",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    tier: "official",
    description:
      "The complete geomantic system — sixteen figures, shield and house charts, judge derivation.",
  },
  {
    id: "decanic-correspondences",
    kind: "correspondence",
    name: "Decanic Correspondences",
    version: "v1.4.2",
    tier: "official",
    description:
      "The thirty-six decans with faces, images, and planetary rulerships.",
  },
  {
    id: "roman-festival-calendar",
    kind: "calendar",
    name: "Roman Festival Calendar",
    version: "v1.0.0",
    tier: "official",
    description:
      "The Roman religious calendar — feriae, nundinae, and the major state festivals.",
  },
];

export function PluginAuthorProfile() {
  const navigate = useNavigate();
  const { did } = useParams<{ did: string }>();
  useTopbar(() => ({ title: "Author" }));

  return (
    <PluginAuthorProfileSurface
      displayName="Agrippa Tools"
      monogram="Α"
      did={did ?? "did:theourgia:terra.example:agrippa-tools"}
      about={
        <p style={{ margin: 0 }}>
          A small workshop building careful, well-sourced
          divination and correspondence plugins for Theourgia.
          Every dataset is cited to a printed edition; nothing is
          invented.
        </p>
      }
      homepage="terra.example/agrippa-tools"
      pluginCount={3}
      firstPublishedLabel="Nov 2025"
      lastActivityLabel="2 days ago"
      licenseLabel="CC-BY-SA-4.0"
      plugins={PLUGINS}
      onPluginClick={(id) => navigate(`/plugins/registry/${id}`)}
    />
  );
}
