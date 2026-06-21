/**
 * EntityCard stories — five layouts covering the typical states:
 * default · severed (care palette) · selected · unread / due / views ·
 * minimal (no actions).
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { EntityCard, type EntitySummary } from "./EntityCard.js";

const meta = {
  title: "EntityCard",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const hekate: EntitySummary = {
  id: "hekate",
  name: "Hekate",
  kind: "deity",
  tradition: "Hellenic",
  status: "active",
  summary: "Goddess of the crossroads, the keys, and the restless dead.",
  due: "Deipnon · in 2 days",
  views: ["Hekate (all)", "Chthonic powers"],
};

const guardian: EntitySummary = {
  id: "guardian",
  name: "The Threshold Guardian",
  kind: "servitor",
  tradition: "Constructed",
  status: "active",
  summary: "Set to ward the household shrine and the doorway it stands in.",
  due: "Feeding · today",
};

const marbas: EntitySummary = {
  id: "marbas",
  name: "Marbas",
  kind: "spirit",
  tradition: "Goetic",
  status: "severed",
  summary: "Approached once in a matter of health; the working is closed.",
};

const yiayia: EntitySummary = {
  id: "yiayia",
  name: "Yiayia (María)",
  kind: "beloved_dead",
  tradition: "Personal",
  status: "active",
  summary: "Keeper of the kitchen ikon and its small lamp.",
  due: "Memorial candle · Sunday",
  views: ["The blessed dead"],
  unread: true,
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      maxWidth: 320,
      background: "var(--bg)",
    }}
  >
    {children}
  </div>
);

export const Default_Hekate: Story = {
  name: "Default · Hekate (deity / active)",
  render: () => (
    <Frame>
      <EntityCard
        entity={hekate}
        onOffer={() => {}}
        onWork={() => {}}
        onAggregate={() => {}}
      />
    </Frame>
  ),
};

export const Constructed_Guardian: Story = {
  name: "Constructed · Threshold Guardian",
  render: () => (
    <Frame>
      <EntityCard
        entity={guardian}
        onOffer={() => {}}
        onWork={() => {}}
        onAggregate={() => {}}
      />
    </Frame>
  ),
};

export const Severed_CarePalette: Story = {
  name: "Severed · care palette (no red)",
  render: () => (
    <Frame>
      <EntityCard
        entity={marbas}
        onOffer={() => {}}
        onWork={() => {}}
        onAggregate={() => {}}
      />
    </Frame>
  ),
};

export const UnreadWithViews: Story = {
  name: "Unread + saved views + due hint",
  render: () => (
    <Frame>
      <EntityCard
        entity={yiayia}
        onOffer={() => {}}
        onWork={() => {}}
        onAggregate={() => {}}
      />
    </Frame>
  ),
};

const SelectableHekate = () => {
  const [selected, setSelected] = useState(true);
  return (
    <Frame>
      <EntityCard
        entity={hekate}
        selected={selected}
        onToggleSelect={setSelected}
        onOffer={() => {}}
        onWork={() => {}}
        onAggregate={() => {}}
      />
    </Frame>
  );
};

export const SelectedForBulk: Story = {
  name: "Selected for bulk action",
  render: () => <SelectableHekate />,
};

export const Minimal_NoActions: Story = {
  name: "Minimal · no quick actions",
  render: () => (
    <Frame>
      <EntityCard
        entity={{
          id: "iris",
          name: "Iris",
          kind: "goddess",
          tradition: "Hellenic",
          status: "observing",
          summary: "Messenger of the gods, of the rainbow that ties the sky to the sea.",
        }}
      />
    </Frame>
  ),
};
