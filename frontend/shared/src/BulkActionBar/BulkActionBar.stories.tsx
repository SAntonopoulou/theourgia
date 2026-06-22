/**
 * BulkActionBar stories — Entities-style, Library-style,
 * Visibility-style action sets.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { BulkActionBar } from "./BulkActionBar.js";

const meta = {
  title: "BulkActionBar",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Stage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 24,
      background: "var(--bg)",
      minHeight: 220,
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
    }}
  >
    {children}
  </div>
);

function chipBtn(text: string, accent?: boolean): React.ReactNode {
  return (
    <button
      type="button"
      style={{
        padding: "7px 12px",
        borderRadius: 7,
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: accent ? "var(--ink)" : "var(--ink-soft)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: accent ? "var(--accent)" : "var(--line-2)",
        background: accent ? "var(--accent-soft)" : "var(--bg-2)",
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}

export const Entities_Style: Story = {
  name: "Entities · 3 beings selected",
  render: () => (
    <Stage>
      <BulkActionBar
        label="3 beings selected"
        actions={
          <>
            {chipBtn("Add tag")}
            {chipBtn("Change visibility")}
            {chipBtn("New saved view", true)}
          </>
        }
        onClear={() => {}}
      />
    </Stage>
  ),
};

export const Library_Style: Story = {
  name: "Library · 5 selected · single Export action",
  render: () => (
    <Stage>
      <BulkActionBar
        label="5 selected"
        actions={chipBtn("Export", true)}
        onClear={() => {}}
      />
    </Stage>
  ),
};

export const Visibility_Style: Story = {
  name: "Visibility · 4 selected · downgrade menu + seal",
  render: () => (
    <Stage>
      <BulkActionBar
        label="4 selected"
        actions={
          <>
            {chipBtn("Change visibility")}
            {chipBtn("Seal")}
          </>
        }
        onClear={() => {}}
      />
    </Stage>
  ),
};

export const Solo_Single: Story = {
  name: "Single being selected · no actions, just clear",
  render: () => (
    <Stage>
      <BulkActionBar
        label="1 being selected"
        onClear={() => {}}
      />
    </Stage>
  ),
};
