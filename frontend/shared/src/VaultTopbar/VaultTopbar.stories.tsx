/**
 * VaultTopbar — admin shell topbar. Renders the route's title/subtitle
 * (set by route via ``useTopbar``), theme cycler, mode toggle, and an
 * optional ``actingAs`` chip.
 *
 * Each story wraps in ``TopbarProvider`` and uses ``useTopbar`` to feed
 * a registration so the bar has something to render.
 */
import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { ActingAsProvider } from "../identity/ActingAsContext.js";
import { ActingAsSwitcher } from "../identity/ActingAsSwitcher.js";
import { ACTING_AS_DEFAULT_ID, DEMO_IDENTITIES } from "../identity/mocks.js";
import { TopbarProvider, useTopbar } from "./TopbarContext.js";
import { VaultTopbar } from "./VaultTopbar.js";

interface DemoTopbarProps {
  title: string;
  subtitle?: string;
  tone?: "sandbox";
  before?: React.ReactNode;
  after?: React.ReactNode;
}

function RegisterTopbar(props: DemoTopbarProps) {
  useTopbar(
    () => ({
      title: props.title,
      subtitle: props.subtitle,
      tone: props.tone,
      before: props.before,
      after: props.after,
    }),
    [props.title, props.subtitle, props.tone, props.before, props.after],
  );
  return null;
}

interface StoryArgs extends DemoTopbarProps {
  withActingAs?: boolean;
}

const meta = {
  title: "Chrome/VaultTopbar",
  parameters: { layout: "fullscreen" },
  argTypes: {
    tone: { control: "select", options: [undefined, "sandbox"] },
    withActingAs: { control: "boolean" },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

function Frame({ withActingAs, ...registration }: StoryArgs) {
  return (
    <ActingAsProvider initial={ACTING_AS_DEFAULT_ID}>
      <TopbarProvider>
        <RegisterTopbar {...registration} />
        <VaultTopbar
          actingAs={
            withActingAs ? <ActingAsSwitcher identities={DEMO_IDENTITIES} /> : undefined
          }
        />
      </TopbarProvider>
    </ActingAsProvider>
  );
}

export const Today: Story = {
  args: { title: "Today", subtitle: "Tuesday, 21 June 2026 · summer solstice" },
  render: (args) => <Frame {...args} />,
};

export const WithActingAs: Story = {
  args: { title: "Journal", subtitle: "Every entry · all identities", withActingAs: true },
  render: (args) => <Frame {...args} />,
};

export const SandboxTone: Story = {
  args: {
    tone: "sandbox",
    title: 'Trying "Hekate · A Working Bundle"',
    subtitle: "Nothing here can touch your real vault · by L. Vespera · unverified",
  },
  render: (args) => <Frame {...args} />,
};
