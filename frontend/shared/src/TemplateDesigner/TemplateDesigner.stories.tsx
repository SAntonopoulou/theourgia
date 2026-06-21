/**
 * Template Designer stories — canvas card variants, full palette,
 * token chips row.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { TemplateBlockCard } from "./TemplateBlockCard.js";
import { TemplateBlockPalette } from "./TemplateBlockPalette.js";
import { TemplateTokenChip } from "./TemplateTokenChip.js";
import { TEMPLATE_TOKENS } from "./catalog.js";

const meta = {
  title: "TemplateDesigner",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 560,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── TemplateBlockCard ─────────────────────────────────────────────

export const Card_MainWorking_Selected: Story = {
  name: "BlockCard · Ritual step (selected, required, with timer)",
  render: () => (
    <Frame>
      <TemplateBlockCard
        id="b5"
        kind="ritual-step"
        label="Main working"
        ghost="The core of the rite, step by step"
        optionSummary="with timer"
        required
        selected
        onSelect={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  ),
};

export const Card_BodySensation: Story = {
  name: "BlockCard · Body sensation (front view)",
  render: () => (
    <Frame>
      <TemplateBlockCard
        id="b6"
        kind="sensation"
        label="Body record"
        ghost="Mark sensations felt during the working"
        optionSummary="front view"
        onSelect={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  ),
};

export const Card_Heading_FirstRow: Story = {
  name: "BlockCard · Heading H1 (first row, disabled up)",
  render: () => (
    <Frame>
      <TemplateBlockCard
        id="b1"
        kind="heading"
        label="Title of the rite"
        ghost="Name this working"
        optionSummary="H1"
        required
        isFirst
        onSelect={() => {}}
        onMoveDown={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  ),
};

export const Card_FormatParagraph: Story = {
  name: "BlockCard · Paragraph (no prompt set)",
  render: () => (
    <Frame>
      <TemplateBlockCard
        id="b8"
        kind="paragraph"
        label="Outcome"
        onSelect={() => {}}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onRemove={() => {}}
      />
    </Frame>
  ),
};

// ─── Mini canvas ───────────────────────────────────────────────────

const SAMPLE_CANVAS = [
  {
    id: "b1",
    kind: "heading" as const,
    label: "Title of the rite",
    ghost: "Name this working",
    optionSummary: "H1",
    required: true,
  },
  {
    id: "b2",
    kind: "calendar-stamp" as const,
    label: "When",
    ghost: "Auto-stamped at writing",
  },
  {
    id: "b3",
    kind: "entity-ref" as const,
    label: "Beings invoked",
    ghost: "Link the deities, spirits, or powers addressed",
  },
  {
    id: "b4",
    kind: "ritual-step" as const,
    label: "Opening",
    ghost: "Banishing, casting, statement of intent",
    optionSummary: "no timer",
  },
  {
    id: "b5",
    kind: "ritual-step" as const,
    label: "Main working",
    ghost: "The core of the rite, step by step",
    optionSummary: "with timer",
    required: true,
  },
  {
    id: "b6",
    kind: "sensation" as const,
    label: "Body record",
    ghost: "Mark sensations felt during the working",
    optionSummary: "front view",
  },
];

const Canvas = () => {
  const [selId, setSelId] = useState<string | null>("b5");
  return (
    <Frame width={620}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {SAMPLE_CANVAS.map((b, i) => (
          <TemplateBlockCard
            key={b.id}
            id={b.id}
            kind={b.kind}
            label={b.label}
            ghost={b.ghost}
            optionSummary={b.optionSummary}
            required={b.required}
            selected={selId === b.id}
            isFirst={i === 0}
            isLast={i === SAMPLE_CANVAS.length - 1}
            onSelect={() => setSelId(b.id)}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
            onRemove={() => {}}
          />
        ))}
      </div>
    </Frame>
  );
};

export const Canvas_Sample: Story = {
  name: "BlockCard · Six-block canvas (Ritual log starter)",
  render: () => <Canvas />,
};

// ─── TemplateBlockPalette ──────────────────────────────────────────

export const Palette_AllSections: Story = {
  name: "BlockPalette · all three sections",
  render: () => (
    <Frame width={280}>
      <TemplateBlockPalette onAdd={() => {}} />
    </Frame>
  ),
};

export const Palette_MagickOnly: Story = {
  name: "BlockPalette · magick-only",
  render: () => (
    <Frame width={280}>
      <TemplateBlockPalette categories={["magick"]} onAdd={() => {}} />
    </Frame>
  ),
};

// ─── TemplateTokenChip ─────────────────────────────────────────────

export const Tokens_All: Story = {
  name: "TokenChip · all five canonical tokens",
  render: () => (
    <Frame width={400}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TEMPLATE_TOKENS.map((t) => (
          <TemplateTokenChip
            key={t.token}
            token={t.token}
            onInsert={() => {}}
          />
        ))}
      </div>
    </Frame>
  ),
};
