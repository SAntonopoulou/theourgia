/**
 * Initiations surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";

import { InitiationListItem } from "./InitiationListItem.js";
import {
  INITIATION_STATUS_ORDER,
  InitiationStatusPill,
} from "./InitiationStatusPill.js";
import { SealedContentsBlock } from "./SealedContentsBlock.js";

const meta = {
  title: "Initiations",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 380,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── InitiationStatusPill ─────────────────────────────────────────

export const StatusPills_All: Story = {
  name: "InitiationStatusPill · all four",
  render: () => (
    <Frame width={340}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {INITIATION_STATUS_ORDER.map((s) => (
          <InitiationStatusPill key={s} status={s} />
        ))}
      </div>
    </Frame>
  ),
};

// ─── InitiationListItem ───────────────────────────────────────────

export const ListItem_Active: Story = {
  name: "InitiationListItem · Hellenic mystery, active",
  render: () => (
    <Frame width={320}>
      <InitiationListItem
        id="i1"
        tradition="Hellenic mystery"
        status="active"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Suspended_Disclosed: Story = {
  name: "InitiationListItem · suspended · disclosed via attestation",
  render: () => (
    <Frame width={320}>
      <InitiationListItem
        id="i2"
        tradition="O.T.O. (Minerval)"
        status="suspended"
        disclosed="Disclosed in attestation · 14 May 2026"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Resigned: Story = {
  name: "InitiationListItem · resigned (care palette)",
  render: () => (
    <Frame width={320}>
      <InitiationListItem
        id="i3"
        tradition="Closed lodge"
        status="resigned"
        onSelect={() => {}}
      />
    </Frame>
  ),
};

export const ListItem_Selected: Story = {
  name: "InitiationListItem · selected · lapsed",
  render: () => (
    <Frame width={320}>
      <InitiationListItem
        id="i4"
        tradition="Bardic order"
        status="lapsed"
        selected
        onSelect={() => {}}
      />
    </Frame>
  ),
};

// ─── SealedContentsBlock ──────────────────────────────────────────

export const Sealed_Default: Story = {
  name: "SealedContentsBlock · default (per-read CTA)",
  render: () => (
    <Frame width={620}>
      <SealedContentsBlock onUnlock={() => {}} />
    </Frame>
  ),
};

export const Sealed_NoCTA: Story = {
  name: "SealedContentsBlock · informational (no unlock CTA)",
  render: () => (
    <Frame width={620}>
      <SealedContentsBlock />
    </Frame>
  ),
};
