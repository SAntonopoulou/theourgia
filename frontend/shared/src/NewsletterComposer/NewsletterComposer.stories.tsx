/**
 * NewsletterComposer stories — H08 Cluster A surface 7 (Hub
 * newsletter). Distinct from Phase 10 publication newsletter.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  NewsletterComposerSurface,
  type NewsletterSource,
} from "./NewsletterComposerSurface.js";

const meta = { title: "H08/NewsletterComposer" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SOURCES: NewsletterSource[] = [
  {
    id: "src-deipnon",
    kind: "entry",
    title: "Dark-moon Deipnon at the shared stone",
    byHandle: "diotima",
  },
  {
    id: "src-draw",
    kind: "divination",
    title: "A three-card draw on the spring rite",
    byHandle: "soror-aurora",
  },
  {
    id: "src-ephesia",
    kind: "publication",
    title: "On the Ephesia Grammata",
    byHandle: "soror-aurora",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <NewsletterComposerSurface
        hubName="The Crossroads Coven"
        recipientCount={34}
        title="The dark-moon issue"
        sources={SOURCES}
        bodyParts={[
          {
            kind: "paragraph",
            text: "This month — a deipnon held at the shared stone, a draw on the spring rite, and notes on the Ephesia Grammata.",
          },
          {
            kind: "embed",
            embedKind: "publication",
            did: "did:theourgia:hearth.sophia.example:soror-aurora",
            title: "On the Ephesia Grammata",
            excerpt:
              "A short essay on the six unutterable names and what survives translation.",
          },
        ]}
      />
    </div>
  ),
};
