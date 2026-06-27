/**
 * PluginConfiguration stories — H09 Cluster A surface 4.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type ConfigField,
  PluginConfigurationSurface,
} from "./PluginConfigurationSurface.js";

const meta = { title: "H09/PluginConfiguration" } satisfies Meta;
export default meta;
type Story = StoryObj;

const FIELDS: ConfigField[] = [
  {
    key: "observer_label",
    kind: "string",
    label: "Observer location label",
    description: "Shown on the Today widget.",
    defaultValue: "Athens — rooftop",
  },
  {
    key: "ephemeris_source",
    kind: "url",
    label: "Ephemeris source",
    description: "Must be an HTTPS URL.",
    defaultValue: "https://ephemeris.example/swe",
  },
  {
    key: "latitude",
    kind: "number",
    label: "Latitude",
    description: "Decimal degrees, −90 to 90.",
    defaultValue: 37.9838,
    min: -90,
    max: 90,
  },
  {
    key: "day_boundary",
    kind: "enum",
    label: "Day-boundary convention",
    description: "Where the magical day begins.",
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
    description: "Adds a small widget naming the planetary ruler.",
    defaultValue: true,
  },
  {
    key: "api_key",
    kind: "secret",
    label: "Self-host API key",
    description:
      "Stored encrypted. The existing value is never displayed.",
    hasValue: true,
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginConfigurationSurface
        pluginName="Planetary Hours"
        fields={FIELDS}
      />
    </div>
  ),
};
