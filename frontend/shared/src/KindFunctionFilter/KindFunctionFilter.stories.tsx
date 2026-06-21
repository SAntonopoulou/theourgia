/**
 * KindFunctionFilter stories — three layouts that exercise the
 * default state, an active sub-selection (Goddess), and the
 * "Show severed" toggle on.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import {
  KindFunctionFilter,
  type KindFunctionFilterCounts,
  type KindFunctionFilterValue,
} from "./KindFunctionFilter.js";

const meta = {
  title: "KindFunctionFilter",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const COUNTS: KindFunctionFilterCounts = {
  total: 14,
  perKind: {
    deity: 2,
    goddess: 1,
    god: 1,
    saint: 1,
    angel: 1,
    daemon: 1,
    spirit: 1,
    ancestor: 1,
    beloved_dead: 1,
    servitor: 1,
    place: 1,
    object: 1,
    other: 1,
  },
  perTradition: {
    Hellenic: 6,
    Gaelic: 1,
    Christian: 1,
    Goetic: 1,
    Personal: 2,
    Constructed: 1,
    Hermetic: 2,
  },
};

const TRADITIONS = [
  "Hellenic",
  "Gaelic",
  "Christian",
  "Hermetic",
  "Goetic",
  "Personal",
  "Constructed",
];

const Frame = ({
  initial,
  initialSevered = false,
}: {
  initial: KindFunctionFilterValue;
  initialSevered?: boolean;
}) => {
  const [value, setValue] = useState<KindFunctionFilterValue>(initial);
  const [showSevered, setShowSevered] = useState(initialSevered);
  return (
    <div
      style={{
        padding: 18,
        width: 236,
        background: "var(--bg-2)",
        borderRight: "1px solid var(--line)",
      }}
    >
      <KindFunctionFilter
        counts={COUNTS}
        value={value}
        onChange={setValue}
        showSevered={showSevered}
        onToggleSevered={setShowSevered}
        traditions={TRADITIONS}
      />
    </div>
  );
};

export const AllKinds: Story = {
  name: "Default — all kinds, no severed",
  render: () => (
    <Frame initial={{ kind: "all", status: "all", tradition: "all" }} />
  ),
};

export const VeneratedSelected: Story = {
  name: "Venerated selected · Active status",
  render: () => (
    <Frame
      initial={{ kind: "venerated", status: "active", tradition: "Hellenic" }}
    />
  ),
};

export const ShowSeveredOn: Story = {
  name: "Show severed enabled",
  render: () => (
    <Frame
      initial={{ kind: "all", status: "all", tradition: "all" }}
      initialSevered
    />
  ),
};
