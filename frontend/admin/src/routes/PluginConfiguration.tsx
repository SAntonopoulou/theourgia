/**
 * PluginConfiguration — admin route at ``/plugins/:id/configure``.
 *
 * Renders the H09 Cluster A surface 4 against fixtures.
 */

import { useNavigate, useParams } from "react-router-dom";

import {
  type ConfigField,
  PluginConfigurationSurface,
  useTopbar,
} from "@theourgia/shared";

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

  return (
    <PluginConfigurationSurface
      pluginName="Planetary Hours"
      fields={FIELDS}
      onBreadcrumbHome={() => navigate("/plugins")}
      onSave={(values) => {
        // TODO Phase 14 — POST /api/v1/plugins/{id}/configure
        // eslint-disable-next-line no-console
        console.info("[plugin-configure] save", id, values);
      }}
      onDiscard={() => {
        // eslint-disable-next-line no-console
        console.info("[plugin-configure] discard", id);
      }}
      onResetSecret={(key) => {
        // eslint-disable-next-line no-console
        console.info("[plugin-configure] reset secret", id, key);
      }}
    />
  );
}
