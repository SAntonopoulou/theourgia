/**
 * InstalledPlugins — admin route at ``/plugins``.
 *
 * Renders the H09 Cluster A surface 1 against fixtures.
 *
 * Wiring deferred to Phase 14:
 *
 *   * GET   /api/v1/plugins/installed   — list owned plugins.
 *   * POST  /api/v1/plugins/{id}/activate · /deactivate ·
 *     /uninstall — per-row kebab actions.
 */

import { useNavigate } from "react-router-dom";

import {
  type InstalledPluginRow,
  InstalledPluginsSurface,
  useTopbar,
} from "@theourgia/shared";

const PLUGINS: InstalledPluginRow[] = [
  {
    id: "p1",
    kind: "divination",
    name: "Geomancy Workbench",
    version: "v2.1.0",
    author: "did:theourgia:terra.example:agrippa-tools",
    description:
      "A full geomantic divination system — the sixteen figures, shield + house charts, and judge derivation.",
    status: "active",
  },
  {
    id: "p2",
    kind: "correspondence",
    name: "Decanic Correspondences",
    version: "v1.4.2",
    author: "did:theourgia:hermetica.org:decan-press",
    description:
      "The thirty-six decans with their faces, images, and planetary + zodiacal rulerships.",
    status: "active",
  },
  {
    id: "p3",
    kind: "editor-block",
    name: "Runic Tabular Block",
    version: "v0.9.1",
    author: "did:theourgia:nine-worlds.example:vala",
    description:
      "Editor blocks for Elder Futhark tables, bind-rune composition, and futhark-line annotation.",
    status: "active",
  },
  {
    id: "p4",
    kind: "cipher",
    name: "Trithemian Cipher",
    version: "v1.0.3",
    author: "did:theourgia:steganographia.example:abbot",
    description:
      "Encode and decode steganographic ciphers from the Polygraphia and Steganographia.",
    status: "disabled",
  },
  {
    id: "p5",
    kind: "exporter",
    name: "Obsidian Vault Exporter",
    version: "v0.6.0",
    author: "did:theourgia:bridges.example:scribe",
    description:
      "Export entries + entities to an Obsidian-compatible Markdown vault.",
    status: "active",
    tombstoned: true,
  },
];

export function InstalledPlugins() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Plugins" }));

  return (
    <InstalledPluginsSurface
      plugins={PLUGINS}
      onBrowseRegistry={() => navigate("/plugins/registry")}
      onPluginAction={(pluginId, action) => {
        // TODO Phase 14 — POST /api/v1/plugins/{id}/{action}.
        // eslint-disable-next-line no-console
        console.info("[plugins] action", pluginId, action);
      }}
    />
  );
}
