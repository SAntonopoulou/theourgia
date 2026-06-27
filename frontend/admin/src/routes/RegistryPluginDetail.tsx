/**
 * RegistryPluginDetail — admin route at ``/plugins/registry/:id``.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  RegistryPluginDetailSurface,
  useTopbar,
} from "@theourgia/shared";

export function RegistryPluginDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Plugin" }));

  return (
    <RegistryPluginDetailSurface
      name="Geomancy Workbench"
      version="v2.1.0"
      kind="divination"
      tier="official"
      author="did:theourgia:terra.example:agrippa-tools"
      license="CC-BY-SA-4.0"
      homepage="terra.example/geomancy"
      description={
        <p style={{ margin: 0 }}>
          The complete geomantic divination system — generate the
          sixteen figures, lay the shield and house charts, and
          derive the Judge. Adds a divination method to the
          Divination workbench and a figure-reference panel.
        </p>
      }
      capabilities={[
        {
          label: "Read all your journal entries",
          wireKey: "read.entries",
          consequence:
            "Reads your entries to suggest geomantic context. It cannot modify or delete them.",
        },
        {
          label: "Add a divination system",
          wireKey: "ui.divination.add-system",
          consequence:
            "Registers geomancy in the Divination workbench.",
        },
        {
          label: "Apply database migrations",
          wireKey: "db.migrations",
          consequence:
            "Creates the tables that store castings and figure data.",
        },
      ]}
      extensionPoints={[
        {
          label: "Divination systems (1)",
          detail: "'geomancy'",
        },
        {
          label: "Entity inspector panels (1)",
          detail: "'geomantic-figure'",
        },
      ]}
      versions={[
        {
          version: "v2.1.0",
          date: "2 days ago",
          notes:
            "Added house-chart derivation and the Part of Fortune.",
        },
        {
          version: "v2.0.0",
          date: "6 weeks ago",
          notes:
            "Rewrote the judge algorithm; corrected the Via / Populus reconciliation.",
        },
        {
          version: "v1.6.2",
          date: "4 months ago",
          notes: "Fixed the Rubeus image in the figure reference.",
        },
      ]}
      onBreadcrumbHome={() => navigate("/plugins/registry")}
      onInstall={() => {
        // TODO Phase 14 — open Capability Review modal
        // eslint-disable-next-line no-console
        console.info("[registry-detail] install", id);
      }}
      onViewAuthor={() =>
        navigate(
          "/plugins/authors/did:theourgia:terra.example:agrippa-tools",
        )
      }
    />
  );
}
