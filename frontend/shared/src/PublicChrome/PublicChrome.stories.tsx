/**
 * PublicChrome — the public site sticky header (wordmark + tradition
 * cycler + dark/light + optional actions). Used on every Astro page that
 * isn't a specialized mode (Trance/Ritual/Print own their own head).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button/Button.js";
import { PublicChrome } from "./PublicChrome.js";

const meta = {
  title: "Chrome/PublicChrome",
  component: PublicChrome,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PublicChrome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCTA: Story = {
  args: {
    actions: (
      <Button variant="primary">Sign in</Button>
    ),
  },
};

export const Minimal: Story = { args: { hideToggles: true } };
