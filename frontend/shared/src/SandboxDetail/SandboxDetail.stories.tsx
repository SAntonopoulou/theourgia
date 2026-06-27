/**
 * SandboxDetail stories — H09 Cluster B surface 14.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type SandboxContentCard,
  SandboxDetailSurface,
} from "./SandboxDetailSurface.js";

const meta = { title: "H09/SandboxDetail" } satisfies Meta;
export default meta;
type Story = StoryObj;

const CARDS: SandboxContentCard[] = [
  {
    id: "c-aries-1",
    glyph: "♈",
    title: "1st decan of Aries",
    ruler: "Mars",
    body: "A man with red eyes, holding a sickle.",
  },
  {
    id: "c-aries-2",
    glyph: "♈",
    title: "2nd decan of Aries",
    ruler: "Sun",
    body: "A woman in green, one leg bare.",
  },
  {
    id: "c-taurus-1",
    glyph: "♉",
    title: "1st decan of Taurus",
    ruler: "Mercury",
    body: "A naked man, an archer, ploughing the earth.",
  },
  {
    id: "c-gemini-1",
    glyph: "♊",
    title: "1st decan of Gemini",
    ruler: "Jupiter",
    body: "A man holding a staff, a servant at his side.",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <SandboxDetailSurface
        sandboxLabel="Decanic Faces preview"
        expiresAtLabel="23 July 2026"
        cards={CARDS}
      />
    </div>
  ),
};
