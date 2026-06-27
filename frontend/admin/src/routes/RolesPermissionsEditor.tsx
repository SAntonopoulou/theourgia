/**
 * RolesPermissionsEditor — admin route at
 * ``/hubs/:hubId/admin/roles``.
 *
 * Renders the H08 §S3 Cluster A surface 12 against fixtures.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET  /api/v1/hubs/{hubId}/roles → list of HubRoleRow.
 *   * POST /api/v1/hubs/{hubId}/roles → append (least-privilege
 *     by default; route caller specifies a key).
 *   * PATCH /api/v1/hubs/{hubId}/roles → bulk replace + optional
 *     `?apply=true` to propagate immediately. The `?apply=true`
 *     edge is the "Save + apply" CTA path.
 *   * The "Apply a template" hook rewrites the local draft from
 *     a server-provided template — no network round-trip yet.
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  type HubCapabilityKey,
  type HubRoleRow,
  RolesPermissionsEditorSurface,
  RPE_CAPABILITIES,
  type RpeTemplate,
  useTopbar,
} from "@theourgia/shared";

function makeRoles(): HubRoleRow[] {
  return [
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
}

export function RolesPermissionsEditor() {
  const { hubId } = useParams<{ hubId: string }>();
  const [roles] = useState<HubRoleRow[]>(makeRoles);

  useTopbar(() => ({ title: "Roles & permissions" }));

  return (
    <RolesPermissionsEditorSurface
      hubLabel="Crossroads Coven"
      hubHref={`/hubs/${hubId ?? "crossroads-coven"}/admin`}
      lastChangedAgo="3 days ago"
      lastChangedBy="did:theourgia:aurora.example:soror-aurora"
      initialRoles={roles}
      onSave={(next) => {
        // TODO Phase 12 — PATCH roles (no apply flag).
        // eslint-disable-next-line no-console
        console.info("[roles-permissions] save (no apply)", next);
      }}
      onSaveAndApply={(next) => {
        // TODO Phase 12 — PATCH roles?apply=true. This edge
        // propagates the new matrix to every member, so the
        // verbatim denied banner shows up on the next attempted
        // action that lacks permission.
        // eslint-disable-next-line no-console
        console.info("[roles-permissions] save + apply", next);
      }}
      onAddCustomRole={() => {
        // TODO Phase 12 — append a least-privilege row.
        // eslint-disable-next-line no-console
        console.info("[roles-permissions] add custom role");
      }}
      onApplyTemplate={(template: RpeTemplate) => {
        // TODO Phase 12 — fetch template + replace draft.
        // eslint-disable-next-line no-console
        console.info("[roles-permissions] apply template", template);
      }}
      onRoleAction={(roleKey) => {
        // TODO Phase 12 — kebab opens contextual menu.
        // eslint-disable-next-line no-console
        console.info("[roles-permissions] role action", roleKey);
      }}
    />
  );
}
