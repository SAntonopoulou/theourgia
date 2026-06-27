/**
 * PluginConfiguration — admin route at ``/plugins/:id/configure``.
 *
 * Wired to ``POST /api/v1/plugins/:id/configure`` per the admin API-
 * wiring convention.
 *
 * Note: the configurable field schema currently comes from the plugin's
 * manifest_json (which the backend stores but does not yet expose
 * structurally). For now the surface renders a static field set as the
 * worked example; once the backend exposes ``manifest_json.config_schema``
 * the fields will be derived from it. The save handler is fully live.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type ConfigField,
  PluginConfigurationSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { useConfigurePlugin } from "../lib/plugins.js";

const FIELDS: ConfigField[] = [
  {
    key: "observer_label",
    kind: "string",
    label: "Observer location label",
    description:
      "A name for the place you compute hours for. Shown on the Today widget.",
    defaultValue: "Athens — rooftop",
  },
  {
    key: "ephemeris_source",
    kind: "url",
    label: "Ephemeris source",
    description:
      "Must be an HTTPS URL. Leave as default unless you self-host the ephemeris.",
    defaultValue: "https://ephemeris.example/swe",
  },
  {
    key: "latitude",
    kind: "number",
    label: "Latitude",
    description:
      "Decimal degrees, −90 to 90. Used to compute the length of each planetary hour.",
    defaultValue: 37.9838,
    min: -90,
    max: 90,
  },
  {
    key: "day_boundary",
    kind: "enum",
    label: "Day-boundary convention",
    description:
      "Where the magical day begins. Most traditions use sunrise.",
    defaultValue: "sunrise",
    options: [
      { value: "sunrise", label: "Sunrise to sunrise" },
      { value: "sunset", label: "Sunset to sunset" },
      { value: "midnight", label: "Midnight to midnight (civil)" },
    ],
  },
  {
    key: "widget_on",
    kind: "boolean",
    label: "Show the current hour on Today",
    description:
      "Adds a small widget naming the planetary ruler of the present hour.",
    defaultValue: true,
  },
  {
    key: "api_key",
    kind: "secret",
    label: "Self-host API key",
    description:
      "Stored encrypted. The existing value is never displayed — use Reset to replace it.",
    hasValue: true,
  },
];

export function PluginConfiguration() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Plugin · Configure" }));

  const save = useConfigurePlugin();

  return (
    <>
      {save.error ? (
        <SurfaceError
          title="Couldn’t save your changes."
          message={save.error.message}
          onRetry={() => save.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <PluginConfigurationSurface
        pluginName="Planetary Hours"
        fields={FIELDS}
        onBreadcrumbHome={() => navigate("/plugins")}
        onSave={(values) => {
          if (!id) return;
          save.mutate({ id, settings: values });
        }}
        onDiscard={() => navigate(`/plugins/${id}`)}
        onResetSecret={(key) => {
          if (!id) return;
          // Reset is "clear the secret"; save with null to clear.
          save.mutate({ id, settings: { [key]: null } });
        }}
      />
    </>
  );
}
