/**
 * FederatedComments stories — H08 Cluster B surface 20.
 * Federated replies mark their source; layout identical otherwise.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  type FedCommentRow,
  FederatedCommentsSurface,
} from "./FederatedCommentsSurface.js";

const meta = { title: "H08/FederatedComments" } satisfies Meta;
export default meta;
type Story = StoryObj;

const APPROVED: FedCommentRow[] = [
  {
    id: "c-local",
    name: "Theophrastos",
    initial: "T",
    federated: false,
    ts: "2 days ago",
    body: "The point about leaving the offering and not looking back is the part most beginners skip.",
  },
  {
    id: "c-remote",
    name: "Frater Lux",
    initial: "F",
    federated: true,
    handle: "@frater-lux@thelema.example",
    instance: "thelema.example",
    ts: "1 day ago",
    body: "Read this twice. The discipline of restraint at the dark moon maps cleanly onto the Thelemic idea of silence.",
  },
];

const PENDING: FedCommentRow[] = [
  {
    id: "c-wanderer",
    name: "a wanderer",
    initial: "A",
    federated: true,
    handle: "@wanderer@mas.to",
    instance: "mas.to",
    ts: "5 hours ago",
    body: "New to all of this — is the egg always raw, or does it matter?",
  },
];

const HIDDEN: FedCommentRow[] = [
  {
    id: "c-spam",
    name: "spam-account",
    initial: "S",
    federated: true,
    handle: "@promo@spam.example",
    instance: "spam.example",
    ts: "3 days ago",
    body: "Unlock your true power with our premium sigil pack — link in bio.",
  },
];

export const Default: Story = {
  render: () => (
    <div style={{ background: "var(--bg)" }}>
      <FederatedCommentsSurface
        publicationTitle="On the Discipline of the Dark Moon"
        approved={APPROVED}
        pending={PENDING}
        hidden={HIDDEN}
      />
    </div>
  ),
};

export const ApprovedOnly: Story = {
  render: () => (
    <div style={{ background: "var(--bg)" }}>
      <FederatedCommentsSurface
        publicationTitle="On the Discipline of the Dark Moon"
        approved={APPROVED}
        pending={[]}
        hidden={[]}
      />
    </div>
  ),
};
