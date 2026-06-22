/**
 * Attestations surface primitive stories.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { AttestationKindBadge } from "./AttestationKindBadge.js";
import { AttestationListItem } from "./AttestationListItem.js";
import {
  ATTESTATION_KIND_META,
  ATTESTATION_KIND_ORDER,
  type AttestationKind,
} from "./attestations.js";

const meta = {
  title: "Attestations",
} satisfies Meta;

export default meta;
type Story = StoryObj;

const Frame = ({
  children,
  width = 340,
}: {
  children: React.ReactNode;
  width?: number;
}) => (
  <div
    style={{
      padding: 22,
      background: "var(--bg-2)",
      borderRight: "1px solid var(--line)",
      maxWidth: width,
    }}
  >
    {children}
  </div>
);

// ─── AttestationKindBadge ─────────────────────────────────────────

export const KindBadges_AllSeven_Small: Story = {
  name: "AttestationKindBadge · 24px (all seven kinds)",
  render: () => (
    <Frame width={340}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {ATTESTATION_KIND_ORDER.map((k) => (
          <div
            key={k}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
            }}
          >
            <AttestationKindBadge kind={k} size={24} />
            {ATTESTATION_KIND_META[k].label}
          </div>
        ))}
      </div>
    </Frame>
  ),
};

export const KindBadge_Large_Bordered: Story = {
  name: "AttestationKindBadge · 40px bordered (detail header)",
  render: () => (
    <Frame width={120}>
      <AttestationKindBadge kind="initiation" size={40} bordered />
    </Frame>
  ),
};

// ─── AttestationListItem ──────────────────────────────────────────

const Selectable = ({
  rows,
  initialSelectedId,
}: {
  rows: Array<{
    id: string;
    subject: string;
    description: string;
    kind: AttestationKind;
    signatureCount: number;
    visibilityLabel: string;
    grantedLabel: string;
    revoked?: boolean;
  }>;
  initialSelectedId: string;
}) => {
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  return (
    <Frame width={330}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((row) => (
          <AttestationListItem
            key={row.id}
            {...row}
            selected={selectedId === row.id}
            onSelect={setSelectedId}
          />
        ))}
      </div>
    </Frame>
  );
};

export const ListItem_FourRows: Story = {
  name: "AttestationListItem · four rows incl. revoked",
  render: () => (
    <Selectable
      initialSelectedId="a1"
      rows={[
        {
          id: "a1",
          subject: "Aspasia",
          description:
            "Initiation as Minerval in the Lyceum tradition.",
          kind: "initiation",
          signatureCount: 2,
          visibilityLabel: "Public",
          grantedLabel: "20 March 2020",
        },
        {
          id: "a2",
          subject: "Theophrastos",
          description:
            "Author of the essay “On the Noetic Triad.”",
          kind: "authorship",
          signatureCount: 1,
          visibilityLabel: "Network",
          grantedLabel: "2 February 2026",
        },
        {
          id: "a3",
          subject: "Frater Lykourgos",
          description:
            "Studied the geomantic art under my instruction, 2024–2026.",
          kind: "teacher-student",
          signatureCount: 2,
          visibilityLabel: "Network",
          grantedLabel: "14 April 2026",
        },
        {
          id: "a4",
          subject: "Aspasia",
          description: "Conferred the grade of Adeptus.",
          kind: "grade-granted",
          signatureCount: 2,
          visibilityLabel: "Public",
          grantedLabel: "1 March 2026",
          revoked: true,
        },
      ]}
    />
  ),
};

export const ListItem_RevokedOnly: Story = {
  name: "AttestationListItem · revoked (dimmed + pill)",
  render: () => (
    <Frame width={330}>
      <AttestationListItem
        id="a4"
        subject="Aspasia"
        description="Conferred the grade of Adeptus."
        kind="grade-granted"
        signatureCount={2}
        visibilityLabel="Public"
        grantedLabel="1 March 2026"
        revoked
      />
    </Frame>
  ),
};
