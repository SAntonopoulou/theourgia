/**
 * Visibility stories — control across all four states, downgrade
 * dialog at each severity, seal dialog in single + bulk modes.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { SealEntryDialog } from "./SealEntryDialog.js";
import { VisibilityControl } from "./VisibilityControl.js";
import { VisibilityDowngradeDialog } from "./VisibilityDowngradeDialog.js";
import type { EntityVisibility } from "../api/types.js";

const meta = {
  title: "Visibility",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 540,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── VisibilityControl ─────────────────────────────────────────────

const ControlDemo = ({ initial }: { initial: EntityVisibility }) => {
  const [value, setValue] = useState<EntityVisibility>(initial);
  const [downgradeTo, setDowngradeTo] = useState<EntityVisibility | null>(null);
  return (
    <Frame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <VisibilityControl
          value={value}
          onChange={setValue}
          onRequestDowngrade={(t) => setDowngradeTo(t)}
        />
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          Current: {value}
          {downgradeTo ? ` · would confirm → ${downgradeTo}` : ""}
        </div>
      </div>
    </Frame>
  );
};

export const Control_Personal: Story = {
  name: "Control · Personal",
  render: () => <ControlDemo initial="personal" />,
};

export const Control_Viewer: Story = {
  name: "Control · Viewer",
  render: () => <ControlDemo initial="viewer" />,
};

export const Control_Hub: Story = {
  name: "Control · Hub",
  render: () => <ControlDemo initial="hub" />,
};

export const Control_Public: Story = {
  name: "Control · Public",
  render: () => <ControlDemo initial="public" />,
};

export const Control_Disabled: Story = {
  name: "Control · Disabled",
  render: () => (
    <Frame>
      <VisibilityControl value="hub" disabled />
    </Frame>
  ),
};

// ─── VisibilityDowngradeDialog ────────────────────────────────────

export const Downgrade_Viewer: Story = {
  name: "Downgrade · Viewer (constructive)",
  render: () => (
    <Frame width={760}>
      <VisibilityDowngradeDialog
        open
        target="viewer"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};

export const Downgrade_Hub: Story = {
  name: "Downgrade · Hub (warn)",
  render: () => (
    <Frame width={760}>
      <VisibilityDowngradeDialog
        open
        target="hub"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};

export const Downgrade_Public: Story = {
  name: "Downgrade · Public (danger — only --danger use)",
  render: () => (
    <Frame width={760}>
      <VisibilityDowngradeDialog
        open
        target="public"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};

export const Downgrade_Bulk_Public: Story = {
  name: "Downgrade · Bulk (3 entries → Public)",
  render: () => (
    <Frame width={760}>
      <VisibilityDowngradeDialog
        open
        target="public"
        entryCount={3}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};

// ─── SealEntryDialog ───────────────────────────────────────────────

export const Seal_Single: Story = {
  name: "Seal · single entry (title confirm)",
  render: () => (
    <Frame width={760}>
      <SealEntryDialog
        open
        entryTitle="Hymn to Hekate (working draft)"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};

export const Seal_Bulk: Story = {
  name: "Seal · bulk (4 entries, SEAL confirm)",
  render: () => (
    <Frame width={760}>
      <SealEntryDialog
        open
        entryCount={4}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    </Frame>
  ),
};
