/**
 * GroupRitualScheduler stories — H08 Cluster A surface 8 (the
 * H08 worked example).
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  GroupRitualSchedulerSurface,
  type GroupRitualSchedulerSurfaceProps,
} from "./GroupRitualSchedulerSurface.js";

const meta = { title: "H08/GroupRitualScheduler" } satisfies Meta;
export default meta;
type Story = StoryObj;

const TRIO: GroupRitualSchedulerSurfaceProps["trio"] = {
  localPrimary: "20 Mar 2026 · 06:12",
  localSecondary: "Europe/Athens (EET)",
  utcPrimary: "04:12 UTC",
  utcSecondary: "20 Mar 2026",
  planetaryRuler: "Sun",
  planetarySecondary: "1st hour of day",
  isCurrent: true,
};

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <GroupRitualSchedulerSurface
        title="Spring equinox — shared dawn adoration"
        description="Each of us greets the rising sun."
        localDatetime="2026-03-20T06:12"
        trio={TRIO}
        locationKind="dispersed"
        participants={["Soror Aurora", "Diotima"]}
        correspondences={[
          "A clear vessel of water",
          "Frankincense or copal",
        ]}
        script="Hail to thee who art Ra in thy rising…"
      />
    </div>
  ),
};
