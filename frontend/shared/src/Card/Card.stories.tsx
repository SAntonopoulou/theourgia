/**
 * Card — raised surface container.
 *
 * Default radius 14px, padding 18px. Use ``interactive`` for clickable
 * cards (e.g. the bundle browser tiles).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Card } from "./Card.js";

const meta = {
  title: "Primitives/Card",
  component: Card,
  tags: ["autodocs"],
  args: {},
  argTypes: {
    as: { control: "select", options: ["article", "section", "div", "li"] },
    interactive: { control: "boolean" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  render: () => (
    <Card>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 19, marginBottom: 8 }}>
        The candle is lit
      </div>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink-soft)", margin: 0 }}>
        Cards hold a single thought. They sit on the raised surface (<code>--bg-2</code>) and use the
        page's hairline (<code>--line</code>) for the border.
      </p>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card interactive onClick={() => undefined}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 4 }}>
        Open the working
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)" }}>
        Activate this card with mouse or keyboard. Press Enter or Space.
      </div>
    </Card>
  ),
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
      {["Journal", "Divination", "Working", "Library"].map((title) => (
        <Card key={title}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 6 }}>{title}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            12 entries this lunation
          </div>
        </Card>
      ))}
    </div>
  ),
};
