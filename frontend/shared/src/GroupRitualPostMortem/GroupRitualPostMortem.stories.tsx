/**
 * GroupRitualPostMortem stories — H08 Cluster A surface 10.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type GroupRitualFrozenFragment,
  GroupRitualPostMortemSurface,
  type GroupRitualReflection,
} from "./GroupRitualPostMortemSurface.js";

const meta = { title: "H08/GroupRitualPostMortem" } satisfies Meta;
export default meta;
type Story = StoryObj;

const FRAGMENTS: GroupRitualFrozenFragment[] = [
  {
    id: "f-3",
    did: "aurora.example",
    time: "06:14",
    body: "The light just cleared the ridge. I can feel the others.",
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

const REFLECTIONS: GroupRitualReflection[] = [
  {
    participantId: "aurora",
    initial: "A",
    name: "Soror Aurora",
    body: "The sense of the others holding the same words at the same instant was unmistakable.",
  },
];

const SCRIPT = [
  "Hail to thee who art Ra in thy rising.",
  "Tahuti standeth in his splendour at the prow.",
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <GroupRitualPostMortemSurface
        ritualTitle="Spring equinox — shared dawn adoration"
        completedAtLabel="20 Mar 2026"
        trio={{
          localPrimary: "06:12",
          utcPrimary: "04:12",
          planetaryRuler: "Sun",
          isCurrent: false,
        }}
        egregore={{
          entityName: "The Dawn Companion",
          entityHref: "/entities/the-dawn-companion",
        }}
        scriptParagraphs={SCRIPT}
        fragments={FRAGMENTS}
        existingReflections={REFLECTIONS}
        viewerCanReflect={true}
      />
    </div>
  ),
};

export const NoEgregore: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <GroupRitualPostMortemSurface
        ritualTitle="Spring equinox — shared dawn adoration"
        completedAtLabel="20 Mar 2026"
        trio={{
          localPrimary: "06:12",
          utcPrimary: "04:12",
          planetaryRuler: "Sun",
          isCurrent: false,
        }}
        scriptParagraphs={SCRIPT}
        fragments={FRAGMENTS}
        existingReflections={REFLECTIONS}
        viewerCanReflect={false}
      />
    </div>
  ),
};
