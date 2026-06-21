/** ObligationTable — two-column "What I promised" | "What they promised". */
import type { Meta, StoryObj } from "@storybook/react";

import { type Obligation, ObligationTable } from "./ObligationTable.js";

const meta = {
  title: "Compose/ObligationTable",
  component: ObligationTable,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof ObligationTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const ours: Obligation[] = [
  {
    id: "o1",
    description: "Pour the daily libation at dawn.",
    status: "in-progress",
    dueRelative: "Sunrise",
  },
  {
    id: "o2",
    description: "Tend the household lamp at dusk.",
    status: "overdue",
    dueRelative: "2 weeks ago",
    notes: "I let it go out three nights running.",
  },
  {
    id: "o3",
    description: "Bring milk to Brigid every Sunday for a year.",
    status: "pending",
    dueRelative: "Next Sunday",
  },
];

const theirs: Obligation[] = [
  {
    id: "t1",
    description: "Tend the household hearth.",
    status: "fulfilled",
    fulfilledAt: "2026-04-12T08:00:00Z",
    notes: "Marked on the equinox.",
  },
  {
    id: "t2",
    description: "Open the door at the threshold.",
    status: "pending",
    dueRelative: "On the next dark moon",
  },
];

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 980, padding: 16, background: "var(--bg)" }}>
    {children}
  </div>
);

export const TwoColumn: Story = {
  render: () => (
    <Frame>
      <ObligationTable
        ours={ours}
        theirs={theirs}
        onFulfill={(side, id, payload) =>
          console.log("fulfill", side, id, payload)
        }
      />
    </Frame>
  ),
};

export const OneSideEmpty: Story = {
  render: () => (
    <Frame>
      <ObligationTable
        ours={ours}
        theirs={[]}
        onFulfill={() => {}}
      />
    </Frame>
  ),
};

export const AllFulfilled: Story = {
  render: () => (
    <Frame>
      <ObligationTable
        ours={ours.map((o) => ({ ...o, status: "fulfilled" as const }))}
        theirs={theirs.map((o) => ({ ...o, status: "fulfilled" as const }))}
        onFulfill={() => {}}
      />
    </Frame>
  ),
};

export const WaivedSide: Story = {
  render: () => (
    <Frame>
      <ObligationTable
        ours={[
          {
            id: "w1",
            description: "Original promise replaced after dissolution rite.",
            status: "waived",
            dueRelative: "Waived 12 Apr",
          },
        ]}
        theirs={theirs}
        onFulfill={() => {}}
      />
    </Frame>
  ),
};
