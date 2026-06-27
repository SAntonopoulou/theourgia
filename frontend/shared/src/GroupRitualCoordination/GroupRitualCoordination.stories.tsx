/**
 * GroupRitualCoordination stories — H08 Cluster A surface 9.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  GroupRitualCoordinationSurface,
  type GroupRitualCoordinationSurfaceProps,
  type GroupRitualFragment,
  type GroupRitualParticipant,
} from "./GroupRitualCoordinationSurface.js";

const meta = { title: "H08/GroupRitualCoordination" } satisfies Meta;
export default meta;
type Story = StoryObj;

const TRIO: GroupRitualCoordinationSurfaceProps["trio"] = {
  localPrimary: "06:12",
  utcPrimary: "04:12",
  planetaryRuler: "Sun",
  isCurrent: true,
};

const PARTICIPANTS: GroupRitualParticipant[] = [
  { id: "you", initial: "Σ", name: "You", presence: "in-ritual" },
  { id: "aurora", initial: "A", name: "Soror Aurora", presence: "in-ritual" },
  { id: "diotima", initial: "Δ", name: "Diotima", presence: "joined" },
  {
    id: "peregrina",
    initial: "P",
    name: "Peregrina",
    presence: "not-present",
  },
];

const FRAGMENTS: GroupRitualFragment[] = [
  {
    id: "f-3",
    did: "aurora.example",
    time: "06:14",
    body: "The light just cleared the ridge.",
  },
  {
    id: "f-2",
    did: "hearth.sophia.example",
    time: "06:13",
    body: "Vessel filled, incense lit. Beginning.",
  },
  {
    id: "f-1",
    did: "terra.example",
    time: "06:12",
    body: "Present at the eastern door.",
  },
];

const SCRIPT = [
  "Hail to thee who art Ra in thy rising.",
  "Tahuti standeth in his splendour at the prow.",
];

export const InProgress: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <GroupRitualCoordinationSurface
        ritualTitle="Spring equinox — shared dawn adoration"
        status="in-progress"
        trio={TRIO}
        participants={PARTICIPANTS}
        scriptParagraphs={SCRIPT}
        fragments={FRAGMENTS}
      />
    </div>
  ),
};
