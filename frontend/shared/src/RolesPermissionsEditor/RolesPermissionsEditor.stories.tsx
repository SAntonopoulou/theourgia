/**
 * RolesPermissionsEditor stories — H08 Cluster A surface 12.
 * Covers the default capability matrix + a denied-banner state.
 */
import type { Meta, StoryObj } from "@storybook/react";

import {
  RolesPermissionsEditorSurface,
  type HubRoleRow,
} from "./RolesPermissionsEditorSurface.js";
import { type HubCapabilityKey, RPE_CAPABILITIES } from "./copy.js";

const meta = {
  title: "H08/RolesPermissionsEditor",
} satisfies Meta;
export default meta;
type Story = StoryObj;

const ROLES: HubRoleRow[] = [
  {
    key: "admin",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(
      RPE_CAPABILITIES.map(([k]) => k),
    ),
  },
  {
    key: "officer",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>([
      "edit_hub_content",
      "moderate_submissions",
      "manage_members",
      "send_newsletters",
      "run_analytics_queries",
      "accept_federation_peers",
      "view_audit_log",
      "schedule_group_rituals",
      "approve_curation_submissions",
    ]),
  },
  {
    key: "moderator",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>([
      "moderate_submissions",
      "view_audit_log",
      "schedule_group_rituals",
      "approve_curation_submissions",
    ]),
  },
  {
    key: "member",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(["schedule_group_rituals"]),
  },
  {
    key: "observer",
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(),
  },
];

const FrameProps = {
  hubLabel: "Crossroads Coven",
  hubHref: "/hubs/crossroads-coven/admin",
  lastChangedAgo: "3 days ago",
  lastChangedBy: "did:theourgia:aurora.example:soror-aurora",
  initialRoles: ROLES,
};

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RolesPermissionsEditorSurface {...FrameProps} />
    </div>
  ),
};

export const WithDeniedBanner: Story = {
  render: () => (
    <div style={{ height: "100vh", background: "var(--bg)" }}>
      <RolesPermissionsEditorSurface
        {...FrameProps}
        denied={{
          action: "delete this entry",
          permission: "manage_permission_matrix",
        }}
      />
    </div>
  ),
};
