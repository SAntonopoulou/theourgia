/**
 * AliasGraph stories — three layouts: two-node symmetric, three-node
 * asymmetric (the Hekate aggregate), and a multi-row mixed.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { AliasGraph, type EntityAggregate } from "./AliasGraph.js";
import { EdgeKindLegend } from "./EdgeKindLegend.js";

const meta = {
  title: "AliasGraph",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 18,
      maxWidth: 760,
      background:
        "radial-gradient(120% 100% at 50% 0%, var(--bg-3), var(--bg-2))",
      borderRadius: 14,
      border: "1px solid var(--line)",
    }}
  >
    {children}
  </div>
);

const hekate: EntityAggregate = {
  focusId: "hekate",
  nodes: [
    { id: "hekate", name: "Hekate", color: "#C9A24C" },
    { id: "hekate-soteira", name: "Hekate-Soteira", color: "#C9A24C" },
    { id: "hekate-trivia", name: "Hekate-Trivia", color: "#C9A24C" },
  ],
  edges: [
    {
      id: "e1",
      from: "hekate",
      to: "hekate-soteira",
      kind: "aspect-includes",
      note: "The saviour aspect, invoked in deliverance.",
    },
    {
      id: "e2",
      from: "hekate",
      to: "hekate-trivia",
      kind: "aspect-includes",
      note: "The crossroads aspect (Trivia / Τριοδῖτις).",
    },
  ],
};

const brigid: EntityAggregate = {
  focusId: "brigid",
  nodes: [
    { id: "brigid", name: "Brigid", color: "#C2554A" },
    { id: "saint-brigid", name: "Saint Brigid", color: "#7E91CE" },
  ],
  edges: [
    {
      id: "e1",
      from: "brigid",
      to: "saint-brigid",
      kind: "syncretic-with",
      note: "Spoken to as one at Imbolc.",
    },
  ],
};

const mixed: EntityAggregate = {
  focusId: "hermes-trismegistos",
  nodes: [
    { id: "hermes-trismegistos", name: "Hermes-Trismegistos", color: "#7FB069" },
    { id: "hermes", name: "Hermes", color: "#7FB069" },
    { id: "thoth", name: "Thoth", color: "#9A86B8" },
    { id: "agathos", name: "Agathos Daimon", color: "#C9A24C" },
    { id: "asklepios", name: "Asklepios", color: "#6BA892" },
  ],
  edges: [
    {
      id: "e1",
      from: "hermes-trismegistos",
      to: "hermes",
      kind: "same-as",
    },
    {
      id: "e2",
      from: "hermes-trismegistos",
      to: "thoth",
      kind: "syncretic-with",
    },
    {
      id: "e3",
      from: "hermes-trismegistos",
      to: "agathos",
      kind: "aspect-includes",
    },
    {
      id: "e4",
      from: "hermes-trismegistos",
      to: "asklepios",
      kind: "epithet-of",
    },
  ],
};

export const HekateAggregate: Story = {
  name: "Hekate aggregate · two aspect-includes",
  render: () => (
    <Frame>
      <AliasGraph aggregate={hekate} onRemoveEdge={() => {}} />
    </Frame>
  ),
};

export const SyncreticPair: Story = {
  name: "Symmetric · syncretic pair",
  render: () => (
    <Frame>
      <AliasGraph aggregate={brigid} onRemoveEdge={() => {}} />
    </Frame>
  ),
};

export const MixedKinds: Story = {
  name: "Multi-row · mixed edge kinds",
  render: () => (
    <Frame>
      <AliasGraph aggregate={mixed} onRemoveEdge={() => {}} />
    </Frame>
  ),
};

// ─── EdgeKindLegend ───────────────────────────────────────────────

const RailFrame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 22,
      maxWidth: 320,
      background: "var(--bg-2)",
      borderLeft: "1px solid var(--line)",
      fontFamily: "var(--font-ui)",
    }}
  >
    <div
      style={{
        fontSize: 10.5,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--ink-mute)",
        marginBottom: 9,
      }}
    >
      Edge kinds
    </div>
    {children}
  </div>
);

export const Legend_AllFive: Story = {
  name: "EdgeKindLegend · all five kinds (rail)",
  render: () => (
    <RailFrame>
      <EdgeKindLegend />
    </RailFrame>
  ),
};

export const Legend_Subset: Story = {
  name: "EdgeKindLegend · symmetric subset only",
  render: () => (
    <RailFrame>
      <EdgeKindLegend kinds={["same-as", "syncretic-with"]} />
    </RailFrame>
  ),
};
