/**
 * ActingAsSwitcher — the topbar identity chip + dropdown. Wraps each
 * story in ``ActingAsProvider`` so the chip can read + write the acting
 * identity state.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ActingAsProvider } from "./ActingAsContext.js";
import { ActingAsSwitcher } from "./ActingAsSwitcher.js";
import { ACTING_AS_DEFAULT_ID, DEMO_IDENTITIES } from "./mocks.js";

const meta = {
  title: "Identity/ActingAsSwitcher",
  component: ActingAsSwitcher,
  tags: ["autodocs"],
  args: { identities: DEMO_IDENTITIES },
  decorators: [
    (Story) => (
      <ActingAsProvider initial={ACTING_AS_DEFAULT_ID}>
        <div style={{ padding: 28, background: "var(--bg)", minHeight: 200 }}>
          <Story />
        </div>
      </ActingAsProvider>
    ),
  ],
} satisfies Meta<typeof ActingAsSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullSet: Story = {};

export const SingleIdentity: Story = {
  args: { identities: [DEMO_IDENTITIES[0]!] },
};

export const NoArchived: Story = {
  args: { identities: DEMO_IDENTITIES.filter((i) => !i.archived) },
};
