/**
 * Contracts surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { BindingKindIcon } from "../BindingKindIcon/index.js";
import { ContractListItem } from "./ContractListItem.js";
import {
  CONTRACT_STATUS_ORDER,
  type ContractStatus,
  ContractStatusPill,
} from "./ContractStatusPill.js";

const meta = {
  title: "Contracts",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 360,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div style={{ padding: 22, background: "var(--bg)", maxWidth: width }}>
    {children}
  </div>
);

// ─── ContractStatusPill ───────────────────────────────────────────

export const StatusPills_AllSix: Story = {
  name: "ContractStatusPill · all six statuses",
  render: () => (
    <Frame width={360}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CONTRACT_STATUS_ORDER.map((s) => (
          <ContractStatusPill key={s} status={s} />
        ))}
      </div>
    </Frame>
  ),
};

export const StatusPill_Breached: Story = {
  name: "ContractStatusPill · breached (care palette, never red)",
  render: () => (
    <Frame width={180}>
      <ContractStatusPill status="breached" />
    </Frame>
  ),
};

// ─── ContractListItem ─────────────────────────────────────────────

const Selectable = ({
  initial,
  status,
}: {
  initial: { title: string; entity: string; binding: "verbal" | "written" | "blood" | "signed" | "sworn" };
  status: ContractStatus;
}) => {
  const [active, setActive] = useState(false);
  return (
    <Frame width={320}>
      <ContractListItem
        id="c1"
        title={initial.title}
        entityName={initial.entity}
        status={status}
        bindingGlyph={<BindingKindIcon kind={initial.binding} size={16} />}
        bindingColor="var(--accent)"
        selected={active}
        onSelect={() => setActive((v) => !v)}
        nextDue={
          status === "active" ? "Due in 2 days · spring offering" : undefined
        }
      />
    </Frame>
  );
};

export const ListItem_Active: Story = {
  name: "ContractListItem · Active · Beltane pact",
  render: () => (
    <Selectable
      initial={{
        title: "Beltane Pact with Brigid, 2026",
        entity: "Brigid",
        binding: "verbal",
      }}
      status="active"
    />
  ),
};

export const ListItem_Fulfilled: Story = {
  name: "ContractListItem · Fulfilled · written accord",
  render: () => (
    <Selectable
      initial={{
        title: "Asklepian incubation accord",
        entity: "Asklepios",
        binding: "written",
      }}
      status="fulfilled"
    />
  ),
};

export const ListItem_Dissolved: Story = {
  name: "ContractListItem · Dissolved (care palette)",
  render: () => (
    <Selectable
      initial={{
        title: "Old crossroads pact",
        entity: "Hekate",
        binding: "sworn",
      }}
      status="dissolved"
    />
  ),
};

export const ListItem_Draft: Story = {
  name: "ContractListItem · Draft (no due hint)",
  render: () => (
    <Selectable
      initial={{
        title: "Midsummer accord (draft)",
        entity: "Apollon",
        binding: "verbal",
      }}
      status="draft"
    />
  ),
};

export const ListItem_Breached: Story = {
  name: "ContractListItem · Breached",
  render: () => (
    <Selectable
      initial={{
        title: "Old conjuration that lapsed",
        entity: "Marbas",
        binding: "blood",
      }}
      status="breached"
    />
  ),
};
