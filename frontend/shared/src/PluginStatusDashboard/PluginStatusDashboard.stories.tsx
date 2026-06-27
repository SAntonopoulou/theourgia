/**
 * PluginStatusDashboard stories — H09 Cluster A surface 5.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type ActiveRow,
  type ErrorRow,
  PluginStatusDashboardSurface,
} from "./PluginStatusDashboardSurface.js";

const meta = { title: "H09/PluginStatusDashboard" } satisfies Meta;
export default meta;
type Story = StoryObj;

const ACTIVE: ActiveRow[] = [
  {
    name: "Decanic Correspondences",
    version: "v1.4.2",
    loadMs: "84 ms",
    extensionPointsLabel: "3 active",
  },
  {
    name: "Geomancy Workbench",
    version: "v2.1.0",
    loadMs: "151 ms",
    extensionPointsLabel: "2 active",
  },
];

const ERRORS: ErrorRow[] = [
  {
    id: "e0",
    name: "Planetary Hours",
    version: "v3.0.0",
    summary: "EphemerisError: failed to load ephemeris table at startup",
    when: "27 Jun · 09:31",
    trace:
      'Traceback (most recent call last):\n  File "plugins/planetary_hours/main.py", line 47, in on_load\n    self.ephemeris = load_swe(ctx.config["ephemeris_source"])\ntheourgia.core.net.NetworkError: unreachable: https://ephemeris.example/swe',
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <PluginStatusDashboardSurface
        active={ACTIVE}
        errors={ERRORS}
        performance={{
          totalLoadTimeLabel: "412 ms",
          totalLoadTimeDetail: "across 4 active plugins, last startup",
          memoryLabel: "~38 MB",
          memoryDetail: "rough estimate, resident",
        }}
      />
    </div>
  ),
};
