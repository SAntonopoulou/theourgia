/**
 * ExportPreview stories — one per render mode plus a citations
 * variant for the entry page.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { ExportPreview } from "./ExportPreview.js";

const meta = {
  title: "ExportPreview",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 30,
      background: "var(--bg)",
      display: "flex",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

const baseEntry = {
  title: "On the noetic flower of the Chaldean Oracles",
  kindLabel: "Study note",
  kindColor: "#CDBE9E",
  stamp: "Sun ☉ in Gemini · waning gibbous · 26 Sivan 5786",
  paragraphs: [
    "The working opened at the appointed hour. I cast the circle deosil, sealed the quarters, and made the preliminary invocation as the incense took.",
    "What follows is set down while the impression is fresh — the cadence of the barbarous names, the quality of the silence after, and the sign by which I judged the reception.",
  ],
};

export const EntryPage_NoCitations: Story = {
  name: "Entry page · no citations",
  render: () => (
    <Frame>
      <ExportPreview
        request={{ kind: "entry-page", entry: baseEntry }}
      />
    </Frame>
  ),
};

export const EntryPage_WithCitations: Story = {
  name: "Entry page · with citations",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "entry-page",
          entry: {
            ...baseEntry,
            citations: [
              "Majercik, R. (1989). The Chaldean Oracles, fr. 1.",
              "Copenhaver, B. (1992). Corpus Hermeticum, XI.",
            ],
          },
        }}
      />
    </Frame>
  ),
};

export const BoundCover_Year: Story = {
  name: "Bound cover · year volume",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "bound-cover",
          bound: {
            title: "Journal of the Year 2026",
            subtitle: "Anno MMXXVI",
            author: "Aspasia",
          },
        }}
      />
    </Frame>
  ),
};

export const BoundCover_Tag: Story = {
  name: "Bound cover · tag collection",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "bound-cover",
          bound: {
            title: "Workings in Theurgy",
            subtitle: "A gathered collection",
            author: "Aspasia",
          },
        }}
      />
    </Frame>
  ),
};

export const EpubCover: Story = {
  name: "EPUB cover",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "epub-cover",
          epub: { title: "Journal 2026", author: "Aspasia" },
        }}
      />
    </Frame>
  ),
};

export const Source_Markdown: Story = {
  name: "Source · Markdown",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "source",
          source: {
            language: "markdown",
            text: `---
title: "On the noetic flower of the Chaldean Oracles"
kind: study_note
date: 12 June 2026
visibility: personal
---

# On the noetic flower of the Chaldean Oracles

*Sun ☉ in Gemini · waning gibbous · 26 Sivan 5786*

The working opened at the appointed hour. I cast the circle
deosil, sealed the quarters, and made the preliminary
invocation as the incense took.

## Citations

1. Majercik, R. (1989). *The Chaldean Oracles*, fr. 1.`,
          },
        }}
      />
    </Frame>
  ),
};

export const Source_HTML: Story = {
  name: "Source · HTML",
  render: () => (
    <Frame>
      <ExportPreview
        request={{
          kind: "source",
          source: {
            language: "html",
            text: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>On the noetic flower of the Chaldean Oracles</title>
  <meta name="kind" content="study_note">
</head>
<body>
  <article class="entry study_note">
    <h1>On the noetic flower of the Chaldean Oracles</h1>
    <p class="stamp">Sun ☉ in Gemini · waning gibbous · 26 Sivan 5786</p>
    <p>The working opened at the appointed hour…</p>
  </article>
</body>
</html>`,
          },
        }}
      />
    </Frame>
  ),
};
