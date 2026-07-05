/**
 * PluginStatus — admin route at ``/plugins/status``.
 *
 * Derives active-plugin rows from the same /plugins/installed feed
 * the InstalledPlugins route uses. Load-time telemetry + memory
 * telemetry aren't emitted by the plugin loader yet, so those
 * fields render as "—" instead of fabricated numbers.
 *
 * Error rows are derived from installs with `state=error`; when the
 * loader begins recording per-plugin stack traces they'll appear
 * here automatically.
 */

import { useMemo } from "react";

import {
  type ActiveRow,
  type ErrorRow,
  PluginStatusDashboardSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type PluginInstall,
  useInstalledPlugins,
} from "../lib/plugins.js";

function toActive(p: PluginInstall): ActiveRow {
  return {
    name: p.name,
    version: p.version,
    loadMs: "—",
    extensionPointsLabel: "—",
  };
}

function toError(p: PluginInstall): ErrorRow {
  return {
    id: p.id,
    name: p.name,
    version: p.version,
    summary: p.description || "Plugin reported an error at load time.",
    when: "—",
    trace: "Per-plugin stack traces are not yet captured by the loader.",
  };
}

export function PluginStatus() {
  useTopbar(() => ({ title: "Plugin status" }));

  const { data, isLoading, error, refetch } = useInstalledPlugins();

  const { active, errors } = useMemo(() => {
    const rows = data ?? [];
    return {
      active: rows.filter((r) => r.state === "active").map(toActive),
      errors: rows.filter((r) => r.state === "error").map(toError),
    };
  }, [data]);

  if (isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn't load plugin status."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <PluginStatusDashboardSurface
      active={active}
      errors={errors}
      performance={{
        totalLoadTimeLabel: "—",
        totalLoadTimeDetail: "loader telemetry not yet emitted",
        memoryLabel: "—",
        memoryDetail: "resident-set-size probe not yet emitted",
      }}
    />
  );
}
