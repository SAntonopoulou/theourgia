/**
 * PluginDetail — admin route at ``/plugins/:id``.
 *
 * Renders the H09 Cluster A surface 2 against fixtures.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  PluginDetailSurface,
  useTopbar,
} from "@theourgia/shared";

export function PluginDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useTopbar(() => ({ title: "Plugin" }));

  return (
    <PluginDetailSurface
      name="Decanic Correspondences"
      version="v1.4.2"
      kind="correspondence"
      status="active"
      author="did:theourgia:hermetica.org:decan-press"
      license="CC-BY-SA-4.0"
      homepage="hermetica.org/decans"
      compatibleVersionRange="Theourgia ≥ 4.0.0"
      description={
        <>
          <p style={{ margin: "0 0 10px" }}>
            The thirty-six decans — the ten-degree divisions of the
            zodiac — with their classical and Egyptian rulerships.
            Each decan carries its planetary ruler, its zodiacal
            sign, the Picatrix image, and the corresponding face
            from the <em>Liber Hermetis</em>.
          </p>
          <p style={{ margin: 0 }}>
            Adds a decan reference panel to the entity inspector
            and a decan-of-the-moment widget to Today.
          </p>
        </>
      }
      capabilities={[
        {
          label: "Read your magical beings",
          wireKey: "read.entities",
          consequence:
            "It reads the entities in your vault to attach correspondences. It cannot change them.",
        },
        {
          label: "Add a divination system",
          wireKey: "ui.divination.add-system",
          consequence:
            "Registers a new divination method in the Divination workbench.",
        },
        {
          label: "Apply database migrations",
          wireKey: "db.migrations",
          consequence:
            "Creates the tables it needs at install and update. Migrations are always disclosed.",
        },
      ]}
      extensionPoints={[
        {
          label: "Editor blocks (1)",
          detail: "'decan-reference'",
        },
        {
          label: "Today widgets (1)",
          detail: "'decan-of-the-moment'",
        },
      ]}
      migrations={[
        {
          id: "0001",
          label: "Seeded the thirty-six decans + faces.",
          date: "12 Mar 2026",
        },
        {
          id: "0002",
          label: "Added Picatrix image references.",
          date: "20 Apr 2026",
        },
      ]}
      storageFootprint="1.8 MB on disk — 36 decan records and 4 cached images."
      updateAvailableVersion="v1.5.0"
      onBreadcrumbHome={() => navigate("/plugins")}
      onConfigure={() => {
        // TODO Phase 14 — navigate to /plugins/{id}/configure
        // eslint-disable-next-line no-console
        console.info("[plugin-detail] configure", id);
      }}
      onUpdate={() => {
        // TODO Phase 14 — open Plugin Update Diff Preview modal.
        // eslint-disable-next-line no-console
        console.info("[plugin-detail] update", id);
      }}
      onDeactivate={() => {
        // eslint-disable-next-line no-console
        console.info("[plugin-detail] deactivate", id);
      }}
      onActivate={() => {
        // eslint-disable-next-line no-console
        console.info("[plugin-detail] activate", id);
      }}
      onUninstall={() => {
        // eslint-disable-next-line no-console
        console.info("[plugin-detail] uninstall", id);
      }}
    />
  );
}
