/**
 * SegmentedControl — small group of mutually exclusive choices (2–5 items).
 *
 * Generic over the value type so consumers stay type-safe at the call site
 * (e.g. Method = "iching" | "geo" in Oracle).
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { SegmentedControl } from "./SegmentedControl.js";

const meta = {
  title: "Primitives/SegmentedControl",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const TwoOptions: Story = {
  render: () => {
    const [value, setValue] = useState<"queue" | "calendar">("queue");
    return (
      <SegmentedControl
        options={[
          { value: "queue", label: "Queue" },
          { value: "calendar", label: "Calendar" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const ThreeOptions: Story = {
  render: () => {
    const [value, setValue] = useState<"base" | "hellenic" | "thelemic">("base");
    return (
      <SegmentedControl
        options={[
          { value: "base", label: "Base" },
          { value: "hellenic", label: "Hel" },
          { value: "thelemic", label: "Thel" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithGlyphs: Story = {
  render: () => {
    const [value, setValue] = useState<"journal" | "divination" | "library">("journal");
    return (
      <SegmentedControl
        options={[
          { value: "journal", label: "Journal", glyph: "journal" },
          { value: "divination", label: "Divination", glyph: "divination" },
          { value: "library", label: "Library", glyph: "library" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const Small: Story = {
  render: () => {
    const [value, setValue] = useState<"all" | "mine" | "shared">("all");
    return (
      <SegmentedControl
        size="sm"
        options={[
          { value: "all", label: "All" },
          { value: "mine", label: "Mine" },
          { value: "shared", label: "Shared" },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
