/**
 * PluginDetail — admin route at ``/plugins/:id``.
 *
 * Fetches the plugin's install row from the same feed InstalledPlugins
 * uses and renders its live data. Capabilities come from the granted
 * list on the install; extension points + migrations are not yet
 * emitted by the loader, so those sections render "—" rather than
 * fabricated data.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  PluginDetailSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { useInstalledPlugins } from "../lib/plugins.js";

const CAPABILITY_HUMAN: Record<string, { label: string; consequence: string }> = {
  "read.entities": {
    label: "Read your magical beings",
    consequence: "It reads the entities in your vault. It cannot change them.",
  },
  "write.entities": {
    label: "Modify your magical beings",
    consequence: "It can add, edit, or archive entities in your vault.",
  },
  "db.migrations": {
    label: "Apply database migrations",
    consequence: "Creates the tables it needs at install and update.",
  },
  "network.outbound": {
    label: "Talk to the network",
    consequence: "Makes outbound HTTP requests on your behalf.",
  },
  "ui.divination.add-system": {
    label: "Add a divination system",
    consequence: "Registers a new divination method in the workbench.",
  },
  "ui.editor.blocks": {
    label: "Add editor blocks",
    consequence: "Adds new block types to the Tiptap editor.",
  },
  "ui.today.widget": {
    label: "Add a Today widget",
    consequence: "Renders on your Today page.",
  },
};

function humaniseCapability(wire: string): { label: string; wireKey: string; consequence: string } {
  const known = CAPABILITY_HUMAN[wire];
  if (known) return { ...known, wireKey: wire };
  return {
    label: wire.replace(/[._-]/g, " "),
    wireKey: wire,
    consequence: "Effect not yet documented for this capability.",
  };
}

export function PluginDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useInstalledPlugins();
  const install = useMemo(
    () => (data ?? []).find((p) => p.id === id),
    [data, id],
  );

  useTopbar(() => ({
    title: install?.name ?? "Plugin",
    subtitle: install?.version,
  }));

  if (isLoading) return <SurfaceSkeleton rowCount={4} />;
  if (error) {
    return (
      <SurfaceError
        title="Couldn't load the plugin."
        message={error.message}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!install) {
    return (
      <SurfaceError
        title="Plugin not found"
        message={`No installed plugin with id ${id ?? "(none)"} in your vault.`}
        onRetry={() => navigate("/plugins")}
        retryLabel="Back to installed"
      />
    );
  }

  const capabilities = install.capabilities.map((cg) =>
    humaniseCapability(cg.capability),
  );

  return (
    <PluginDetailSurface
      name={install.name}
      version={install.version}
      kind="widget"
      status={
        install.state === "active"
          ? "active"
          : install.state === "error"
            ? "error"
            : "disabled"
      }
      author={install.author}
      license={install.license}
      homepage={install.homepage ?? undefined}
      compatibleVersionRange="—"
      description={<p style={{ margin: 0 }}>{install.description}</p>}
      capabilities={capabilities}
      extensionPoints={[]}
      migrations={[]}
      storageFootprint="—"
      updateAvailableVersion={undefined}
      onBreadcrumbHome={() => navigate("/plugins")}
      onConfigure={() => navigate(`/plugins/${install.id}/configure`)}
      onUpdate={() => {
        // Update-diff preview surface queued in H09 Cluster A close-out.
      }}
      onDeactivate={() => {
        // Wire via usePluginAction from /plugins list handler.
      }}
      onActivate={() => {
        // Wire via usePluginAction from /plugins list handler.
      }}
      onUninstall={() => {
        // Wire via usePluginAction from /plugins list handler.
      }}
    />
  );
}
