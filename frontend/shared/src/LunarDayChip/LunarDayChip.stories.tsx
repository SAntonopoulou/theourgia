/**
 * LunarDayChip — the Today dashboard's Attic lunar-day banner (H12).
 * The observance is the actionable part; the phase percentage is
 * secondary. Styled with the ``--lunar`` alias tokens.
 */
import type { Meta, StoryObj } from "@storybook/react";

import type { TodayContextRead } from "../api/types.js";
import { LunarDayChip } from "./LunarDayChip.js";

function context(overrides: Partial<TodayContextRead> = {}): TodayContextRead {
  return {
    date: "2026-07-25",
    attic: {
      year: 3,
      year_span: "2026/27",
      month: 1,
      month_name: "Hekatombaion",
      day: 29,
      month_length: 29,
      is_intercalary_year: false,
    },
    observance: null,
    moon: { phase_angle: 351.4, phase_name: "Waning crescent" },
    attribution: "Attic reckoning computed locally.",
    ...overrides,
  };
}

const meta = {
  title: "Today/LunarDayChip",
  component: LunarDayChip,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof LunarDayChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Deipnon: Story = {
  args: { context: context({ observance: "deipnon" }) },
};

export const Noumenia: Story = {
  args: {
    context: context({
      observance: "noumenia",
      attic: { ...context().attic, day: 1 },
      moon: { phase_angle: 8, phase_name: "New moon" },
    }),
  },
};

export const AgathosDaimon: Story = {
  args: {
    context: context({
      observance: "agathos_daimon",
      attic: { ...context().attic, day: 2 },
      moon: { phase_angle: 21, phase_name: "Waxing crescent" },
    }),
  },
};

export const OrdinaryDay: Story = {
  args: {
    context: context({
      attic: { ...context().attic, day: 14 },
      moon: { phase_angle: 172, phase_name: "Full moon" },
    }),
  },
};

export const WithAction: Story = {
  args: {
    context: context({ observance: "deipnon" }),
    action: (
      <a
        href="/calendar"
        style={{
          padding: "8px 14px",
          borderRadius: "var(--r-md, 8px)",
          border: "1px solid var(--network-line)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--network)",
          textDecoration: "none",
        }}
      >
        Observances
      </a>
    ),
  },
};
