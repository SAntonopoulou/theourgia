/**
 * MultiCalendarCard stories — covering the four widget states the
 * design specifies (normal · loading · empty · error) plus a story
 * for an expanded row.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type CalendarEntry,
  MultiCalendarCard,
} from "./MultiCalendarCard.js";

const meta = {
  title: "MultiCalendarCard",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      maxWidth: 470,
      background: "var(--bg)",
    }}
  >
    {children}
  </div>
);

const CALENDARS: CalendarEntry[] = [
  {
    id: "gregorian",
    name: "Gregorian",
    family: "solar",
    longForm: "Sunday, 21 June 2026",
    extras: [
      { k: "ISO", v: "2026-06-21 · week 25, day 172" },
      { k: "Short", v: "21/06/2026" },
    ],
  },
  {
    id: "julian",
    name: "Julian",
    family: "solar",
    longForm: "Sunday, 8 June 2026 (O.S.)",
    extras: [
      { k: "Offset", v: "13 days behind Gregorian" },
      { k: "Style", v: "Old Style — still used liturgically" },
    ],
    sourceNote: "Julian reckoning, drift since the 1582 reform.",
  },
  {
    id: "hebrew",
    name: "Hebrew",
    family: "lunisolar",
    isHebrew: true,
    longForm: "יום ראשון, ז׳ בְּתַמּוּז תשפ״ו",
    extras: [
      { k: "Civil", v: "7 Tammuz 5786" },
      { k: "Year", v: "Common year — 12 months, 354 days" },
    ],
    sourceNote: "Fixed calendar of Hillel II; molad-based.",
  },
  {
    id: "thelemic",
    name: "Thelemic",
    family: "ritual",
    primary: "Anno V∶xiii",
    secondary: "· EV 2026",
    extras: [
      { k: "Year began", v: "Vernal equinox, 20 March 2026, 09:01 UTC" },
      { k: "Cycle", v: "Docosaeteris VI, year xiii" },
      { k: "Sol / Luna", v: "☉ in 0° Cancer (solstice) · ☽ in Gemini" },
    ],
    sourceNote: "Reckoned from the Equinox of the Gods, 1904 EV.",
  },
];

const settingsFooter = (
  <>
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-mute)"
      strokeWidth={1.5}
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 8v8M8 12h8" />
    </svg>
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: "var(--ink-mute)",
      }}
    >
      Enable more in
    </span>
    <span
      style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: "var(--accent)",
      }}
    >
      Settings · Calendars →
    </span>
  </>
);

export const Normal: Story = {
  name: "Normal · all four calendars",
  render: () => (
    <Frame>
      <MultiCalendarCard calendars={CALENDARS} footer={settingsFooter} />
    </Frame>
  ),
};

export const Thelemic_Expanded: Story = {
  name: "Thelemic row expanded",
  render: () => (
    <Frame>
      <MultiCalendarCard
        calendars={CALENDARS}
        defaultExpanded={["thelemic"]}
        footer={settingsFooter}
      />
    </Frame>
  ),
};

export const Loading: Story = {
  name: "Loading",
  render: () => (
    <Frame>
      <MultiCalendarCard calendars={CALENDARS} state="loading" />
    </Frame>
  ),
};

export const Empty: Story = {
  name: "Empty — no calendars enabled",
  render: () => (
    <Frame>
      <MultiCalendarCard calendars={[]} state="empty" />
    </Frame>
  ),
};

export const Error_State: Story = {
  name: "Error — service unreachable",
  render: () => (
    <Frame>
      <MultiCalendarCard calendars={[]} state="error" />
    </Frame>
  ),
};
