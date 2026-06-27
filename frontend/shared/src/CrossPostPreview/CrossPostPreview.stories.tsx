/**
 * CrossPostPreview stories — H08 Cluster B surface 21 · FINAL.
 * Mastodon preview rendered in Mastodon's palette (not Theourgia
 * tokens — the user sees what the audience sees).
 */
import type { Meta, StoryObj } from "@storybook/react";

import { CrossPostPreviewModal } from "./CrossPostPreviewModal.js";

const meta = { title: "H08/CrossPostPreview" } satisfies Meta;
export default meta;
type Story = StoryObj;

const BASE = {
  entryTitle: "On the Discipline of the Dark Moon",
  authorName: "Aspasia of the Crossroads",
  authorHandle: "@aspasia@hearth.sophia.example",
  authorInitial: "Θ",
  previewBody:
    "On the discipline of the dark moon: the practice is one of restraint, not petition. You leave the Deipnon at the crossroads, light the third lamp, and do not look back. The silence afterward is the working…",
  canonicalUrl: "hearth.sophia.example/@aspasia/dark-moon",
  onSkip: () => {},
  onCrossPost: () => {},
};

export const WithContentWarning: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <CrossPostPreviewModal
        {...BASE}
        contentWarning="Ritual account — dark moon practice"
      />
    </div>
  ),
};

export const NoContentWarning: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <CrossPostPreviewModal {...BASE} />
    </div>
  ),
};
