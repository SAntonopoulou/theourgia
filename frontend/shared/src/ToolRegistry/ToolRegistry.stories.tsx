/**
 * Tool Registry — visual + a11y baselines.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { AltarsList } from "./AltarsList.js";
import { DEMO_TOOLS } from "./copy.js";
import { ToolCard } from "./ToolCard.js";
import { ToolDetailDrawer } from "./ToolDetailDrawer.js";
import { ToolKindIcon } from "./ToolKindIcon.js";
import { ToolRegistrySurface } from "./ToolRegistrySurface.js";

const meta = {
  title: "ToolRegistry",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 1280,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div
    style={{
      background: "var(--bg)",
      color: "var(--ink)",
      padding: 24,
      maxWidth: width,
    }}
  >
    {children}
  </div>
);

// ─── Primitives ──────────────────────────────────────────────────

export const Icons_All14: Story = {
  name: "ToolKindIcon · all 14 kinds",
  render: () => (
    <Frame width={720}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 16,
        }}
      >
        {[
          "wand",
          "athame",
          "chalice",
          "pentacle",
          "censer",
          "bell",
          "sword",
          "lamp",
          "mirror",
          "bowl",
          "statue",
          "cingulum",
          "robe",
          "other",
        ].map((k) => (
          <div
            key={k}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: "var(--accent)",
            }}
          >
            <ToolKindIcon kind={k as never} size={36} />
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-mute)",
              }}
            >
              {k}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};

export const Card_Consecrated: Story = {
  name: "ToolCard · consecrated (--care pill)",
  render: () => (
    <Frame width={220}>
      <ToolCard tool={DEMO_TOOLS.find((t) => t.consDate != null)!} />
    </Frame>
  ),
};

export const Card_Pending: Story = {
  name: "ToolCard · not yet consecrated (muted pill)",
  render: () => (
    <Frame width={220}>
      <ToolCard tool={DEMO_TOOLS.find((t) => t.consDate == null)!} />
    </Frame>
  ),
};

export const Altars_List: Story = {
  name: "AltarsList · 2 altars (1 permanent)",
  render: () => (
    <Frame width={800}>
      <AltarsList />
    </Frame>
  ),
};

// ─── Drawer variants ─────────────────────────────────────────────

export const Drawer_Consecrated: Story = {
  name: "ToolDetailDrawer · consecrated (care chrome + working link)",
  render: () => (
    <Frame width={1100}>
      <div
        style={{
          position: "relative",
          height: 720,
          background: "var(--bg-2)",
        }}
      >
        <ToolDetailDrawer
          open
          tool={DEMO_TOOLS.find((t) => t.consDate != null)!}
          onClose={() => {}}
        />
      </div>
    </Frame>
  ),
};

export const Drawer_Pending: Story = {
  name: "ToolDetailDrawer · pending (honesty note + Link CTA)",
  render: () => (
    <Frame width={1100}>
      <div
        style={{
          position: "relative",
          height: 720,
          background: "var(--bg-2)",
        }}
      >
        <ToolDetailDrawer
          open
          tool={DEMO_TOOLS.find((t) => t.consDate == null)!}
          onClose={() => {}}
        />
      </div>
    </Frame>
  ),
};

// ─── Surface ─────────────────────────────────────────────────────

export const Surface_Tools: Story = {
  name: "ToolRegistrySurface · Tools (default · 8 cards)",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <ToolRegistrySurface />
      </div>
    </Frame>
  ),
};

export const Surface_Tools_Filtered: Story = {
  name: "ToolRegistrySurface · filtered to Athame",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <ToolRegistrySurface initialKindFilter="athame" />
      </div>
    </Frame>
  ),
};

export const Surface_Altars: Story = {
  name: "ToolRegistrySurface · Altars view",
  render: () => (
    <Frame width={1440}>
      <div style={{ height: 820 }}>
        <ToolRegistrySurface initialView="altars" />
      </div>
    </Frame>
  ),
};
