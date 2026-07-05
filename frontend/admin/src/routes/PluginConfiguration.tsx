/**
 * PluginConfiguration — admin route at ``/plugins/:id/configure``.
 *
 * Live-wired:
 *   · GET  /api/v1/plugins/installed   → find the row + read its
 *     manifest.config_schema for the field list.
 *   · POST /api/v1/plugins/:id/configure → persist the new values.
 *
 * When the plugin has no config_schema (older bundles, or plugins that
 * simply don't need config), the surface renders an honest "no
 * configurable fields" empty state instead of a fabricated example.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type ConfigField,
  PluginConfigurationSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { useConfigurePlugin, useInstalledPlugins } from "../lib/plugins.js";

interface ManifestField {
  key: string;
  kind: string;
  label: string;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  hasValue?: boolean;
}

function toConfigField(f: ManifestField): ConfigField | null {
  const base = {
    key: f.key,
    label: f.label,
    description: f.description ?? "",
  } as const;
  switch (f.kind) {
    case "string":
      return {
        ...base,
        kind: "string",
        defaultValue: typeof f.defaultValue === "string" ? f.defaultValue : "",
      };
    case "url":
      return {
        ...base,
        kind: "url",
        defaultValue: typeof f.defaultValue === "string" ? f.defaultValue : "",
      };
    case "number":
      return {
        ...base,
        kind: "number",
        defaultValue: typeof f.defaultValue === "number" ? f.defaultValue : 0,
        min: f.min,
        max: f.max,
      };
    case "boolean":
      return {
        ...base,
        kind: "boolean",
        defaultValue: Boolean(f.defaultValue),
      };
    case "enum":
      return {
        ...base,
        kind: "enum",
        defaultValue: typeof f.defaultValue === "string" ? f.defaultValue : "",
        options: Array.isArray(f.options) ? f.options : [],
      };
    case "secret":
      return {
        ...base,
        kind: "secret",
        hasValue: Boolean(f.hasValue),
      };
    default:
      return null;
  }
}

export function PluginConfiguration() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Plugin · Configure" }));

  const { data, isLoading, error, refetch } = useInstalledPlugins();
  const save = useConfigurePlugin();

  const install = useMemo(
    () => (data ?? []).find((p) => p.id === id) ?? null,
    [data, id],
  );

  const fields = useMemo<ConfigField[]>(() => {
    if (!install) return [];
    const schema = install.manifest?.config_schema;
    if (!Array.isArray(schema)) return [];
    return (schema as ManifestField[])
      .map(toConfigField)
      .filter((f): f is ConfigField => f !== null);
  }, [install]);

  if (isLoading) return <SurfaceSkeleton rowCount={4} />;
  if (error) {
    return (
      <SurfaceError
        title="Couldn't load plugin."
        message={error.message}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!install) {
    return (
      <SurfaceError
        title="Plugin not found."
        message={`No installed plugin with id ${id ?? ""}.`}
      />
    );
  }

  return (
    <>
      {save.error ? (
        <SurfaceError
          title="Couldn't save your changes."
          message={save.error.message}
          onRetry={() => save.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <PluginConfigurationSurface
        pluginName={install.name}
        fields={fields}
        onBreadcrumbHome={() => navigate("/plugins")}
        onSave={(values) => {
          if (!id) return;
          save.mutate({ id, settings: values });
        }}
        onDiscard={() => navigate(`/plugins/${id}`)}
        onResetSecret={(key) => {
          if (!id) return;
          save.mutate({ id, settings: { [key]: null } });
        }}
      />
    </>
  );
}
