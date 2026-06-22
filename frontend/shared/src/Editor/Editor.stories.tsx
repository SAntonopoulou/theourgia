/**
 * Theourgia Editor — visual + a11y baselines.
 *
 * Stories render the live Tiptap surface so visual regression catches
 * any toolbar / node-view drift. The slash menu appears as a separate
 * story so its layout is captured independently.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { type CSSProperties, useState } from "react";

import { TiptapEditor } from "./TiptapEditor.js";
import { SlashMenu } from "./SlashMenu.js";
import { filterSlashCommands } from "./slashCommands.js";

const meta = {
  title: "Editor",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 920,
  height = 720,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
}) => {
  const style: CSSProperties = {
    background: "var(--bg)",
    color: "var(--ink)",
    width,
    height,
    display: "flex",
    flexDirection: "column",
  };
  return <div style={style}>{children}</div>;
};

const SEED_DOC = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Invocation of the Agathos Daimon" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text:
            "Began with the banishing by the Lesser Ritual of the Pentagram, then the Bornless preliminary invocation. The temple settled quickly tonight — the candle flames steadied at the third circumambulation.",
        },
      ],
    },
    {
      type: "ritualLog",
      attrs: {
        entries: [
          { time: "14:12", text: "Banishing — LRP, all quarters" },
          { time: "14:18", text: "Bornless preliminary invocation" },
          { time: "14:31", text: "Conjuration — third call, presence felt" },
        ],
      },
    },
    {
      type: "quoteCitation",
      attrs: {
        sourceText: "Ἐγώ εἰμι ὁ Ἀκέφαλος δαίμων…",
        sourceScript: "el",
        translation: "“I am the Headless daemon, seeing with my feet.”",
        citation: "Papyri Graecae Magicae, PGM V. 96–172",
      },
    },
    {
      type: "gematria",
      attrs: { word: "ἀγαθοδαίμων", script: "greek", also: "also: ἡ σφραγίς · 989" },
    },
    {
      type: "sensation",
      attrs: {
        points: [
          { y: 8, color: "var(--accent)", label: "Crown · pressure" },
          { y: 38, color: "var(--c-divination)", label: "Throat · cool" },
          { y: 58, color: "var(--c-working)", label: "Solar plexus · heat" },
        ],
      },
    },
  ],
};

const EMPTY_DOC = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Untitled draft" }],
    },
    { type: "paragraph" },
  ],
};

const editorStyles = `
  .theourgia-editor {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
  }
  .theourgia-editor .ProseMirror {
    padding: 28px;
    outline: none;
    max-width: 720px;
    margin: 0 auto;
  }
  .theourgia-editor .ProseMirror h1 {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 36px;
    line-height: 1.1;
    color: var(--ink);
    margin: 0 0 24px;
  }
  .theourgia-editor .ProseMirror p {
    font-family: var(--font-serif);
    font-size: 18px;
    line-height: 1.7;
    color: var(--ink);
    margin: 0 0 22px;
    text-wrap: pretty;
  }
`;

export const Editor_Default: Story = {
  name: "Editor · seeded document (6 custom blocks)",
  render: () => (
    <Frame>
      <style>{editorStyles}</style>
      <TiptapEditor initialDoc={SEED_DOC} />
    </Frame>
  ),
};

export const Editor_Empty: Story = {
  name: "Editor · empty draft (placeholder)",
  render: () => (
    <Frame>
      <style>{editorStyles}</style>
      <TiptapEditor initialDoc={EMPTY_DOC} placeholder="Begin writing…" />
    </Frame>
  ),
};

export const Editor_ReadOnly: Story = {
  name: "Editor · read-only (no toolbar / no slash)",
  render: () => (
    <Frame>
      <style>{editorStyles}</style>
      <TiptapEditor initialDoc={SEED_DOC} editable={false} />
    </Frame>
  ),
};

export const Slash_Menu: Story = {
  name: "SlashMenu · all 6 commands",
  render: () => {
    const [active, setActive] = useState(0);
    return (
      <Frame width={420} height={520}>
        <div style={{ position: "relative", padding: 24, flex: 1 }}>
          <SlashMenu
            open
            query=""
            activeIndex={active}
            onActiveIndexChange={setActive}
            onSelect={() => {}}
            position={{ top: 0, left: 0 }}
          />
        </div>
      </Frame>
    );
  },
};

export const Editor_HeadingFocused: Story = {
  name: "Editor · heading focus (Block-kind menu reads H1)",
  render: () => {
    const HEADING_FIRST_DOC = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Lesser Banishing Ritual" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Caret at the start of the heading." }],
        },
      ],
    };
    return (
      <Frame>
        <style>{editorStyles}</style>
        <TiptapEditor initialDoc={HEADING_FIRST_DOC} />
      </Frame>
    );
  },
};

import { pickIchingSnapshot, pickTarotSnapshot } from "./nodes/DivinationNode.js";

export const Editor_WithChartAndReadings: Story = {
  name: "Editor · chart + tarot + iching nodes (B99a)",
  render: () => {
    const tarotCards = pickTarotSnapshot("three", 4242);
    const ichingLines = pickIchingSnapshot(4242);
    const CHART_DOC = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Reading log — 2026-06-23" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text:
                "Opening the day with a three-card spread and a hexagram cast against the same question.",
            },
          ],
        },
        {
          type: "divination",
          attrs: {
            kind: "tarot",
            seed: 4242,
            question: "What does today's body need from this practice?",
            spread: "three",
            cards: tarotCards,
            lines: [],
          },
        },
        {
          type: "divination",
          attrs: {
            kind: "iching",
            seed: 4242,
            question: "And from the spirit's side?",
            spread: "three",
            cards: [],
            lines: ichingLines,
          },
        },
        {
          type: "chart",
          attrs: {
            title: "Daybreak natal — 2026-06-23, 05:18",
            description: "Tropical · Placidus · sunrise chart for the question",
            snapshot: null,
          },
        },
      ],
    };
    return (
      <Frame>
        <style>{editorStyles}</style>
        <TiptapEditor initialDoc={CHART_DOC} />
      </Frame>
    );
  },
};

export const Slash_Menu_Filtered: Story = {
  name: "SlashMenu · filtered query (\"s\")",
  render: () => {
    const [active, setActive] = useState(0);
    void filterSlashCommands("s");
    return (
      <Frame width={420} height={420}>
        <div style={{ position: "relative", padding: 24, flex: 1 }}>
          <SlashMenu
            open
            query="s"
            activeIndex={active}
            onActiveIndexChange={setActive}
            onSelect={() => {}}
            position={{ top: 0, left: 0 }}
          />
        </div>
      </Frame>
    );
  },
};
