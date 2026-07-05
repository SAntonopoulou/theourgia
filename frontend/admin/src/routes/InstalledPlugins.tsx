/**
 * InstalledPlugins — admin route at ``/plugins``.
 *
 * THE worked example for the admin API-wiring convention:
 *
 *   · TanStack Query for fetching + cache invalidation
 *   · SurfaceSkeleton for loading
 *   · SurfaceError (inline --warn-soft banner) for failure
 *   · Mutation for per-row activate / deactivate / uninstall actions
 *
 * Backend routes: `backend/theourgia/api/routers/v1/plugins.py`.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  type InstalledPluginRow,
  InstalledPluginsSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type PluginInstall,
  usePluginAction,
  useInstalledPlugins,
} from "../lib/plugins.js";

const KNOWN_KINDS: readonly InstalledPluginRow["kind"][] = [
  "divination",
  "calendar",
  "cipher",
  "correspondence",
  "editor-block",
  "widget",
  "exporter",
  "importer",
  "notification",
  "auth",
  "storage",
  "email",
  "federation-event",
  "ap-object",
];

function deriveKind(install: PluginInstall): InstalledPluginRow["kind"] {
  const manifest = install as unknown as {
    manifest_json?: { kind?: string };
  };
  const claimed = manifest.manifest_json?.kind;
  if (
    typeof claimed === "string" &&
    (KNOWN_KINDS as readonly string[]).includes(claimed)
  ) {
    return claimed as InstalledPluginRow["kind"];
  }
  return "widget";
}

function toRow(install: PluginInstall): InstalledPluginRow {
  let status: InstalledPluginRow["status"] = "disabled";
  if (install.state === "active") {
    status = "active";
  } else if (install.state === "error") {
    status = "error";
  }
  return {
    id: install.id,
    kind: deriveKind(install),
    name: install.name,
    version: install.version,
    author: install.author,
    description: install.description,
    status,
  };
}

export function InstalledPlugins() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Plugins" }));

  const { data, isLoading, error, refetch } = useInstalledPlugins();
  const action = usePluginAction();

  const rows = useMemo(
    () => (data ? data.map(toRow) : []),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={5} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your installed plugins."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      {action.error ? (
        <SurfaceError
          title="That action didn’t go through."
          message={action.error.message}
          onRetry={() => action.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <InstalledPluginsSurface
        plugins={rows}
        onBrowseRegistry={() => navigate("/registry")}
        onPluginAction={(pluginId, kind) => {
          if (
            kind === "activate" ||
            kind === "deactivate" ||
            kind === "uninstall"
          ) {
            action.mutate({ id: pluginId, action: kind });
            return;
          }
          if (kind === "configure") {
            navigate(`/plugins/${pluginId}/configure`);
            return;
          }
          if (kind === "view-capabilities") {
            navigate(`/plugins/${pluginId}`);
            return;
          }
          // "update" handled by the PluginUpdateDiff surface (H09 17/17)
        }}
      />
    </>
  );
}
