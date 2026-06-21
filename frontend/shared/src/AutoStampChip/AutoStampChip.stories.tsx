/** AutoStampChip — astro + calendar auto-stamp chip with expand-on-click. */
import type { Meta, StoryObj } from "@storybook/react";

import { AutoStampChip } from "./AutoStampChip.js";

const meta = {
  title: "Compose/AutoStampChip",
  component: AutoStampChip,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof AutoStampChip>;

export default meta;
type Story = StoryObj<typeof meta>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      background: "var(--bg)",
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    {children}
  </div>
);

export const BothStamps: Story = {
  render: () => (
    <Frame>
      <AutoStampChip
        astro="Sun ☉ Gemini · dark moon · hour of Saturn"
        calendar="24 Sivan 5786"
      />
    </Frame>
  ),
};

export const AstroOnly: Story = {
  render: () => (
    <Frame>
      <AutoStampChip astro="Sun ☉ Cancer · waxing crescent" />
    </Frame>
  ),
};

export const CalendarOnly: Story = {
  render: () => (
    <Frame>
      <AutoStampChip calendar="1 Mounukhion · Athenian lunar month" />
    </Frame>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Frame>
      <AutoStampChip
        astro="Sun ☉ Gemini · dark moon"
        calendar="24 Sivan 5786"
      />
      <AutoStampChip
        astro="Sun ☉ Cancer · waxing crescent"
        calendar="13 Tammuz 5786"
      />
      <AutoStampChip
        astro="Sun ☉ Leo · full moon · hour of the Sun"
        calendar="14 Av 5786 · Tu B'Av"
      />
    </Frame>
  ),
};
