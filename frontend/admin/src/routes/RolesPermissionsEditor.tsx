/**
 * RolesPermissionsEditor — admin route at ``/hubs/:hubId/admin/roles``.
 *
 * Wired to GET / PATCH ``/api/v1/hubs/:hubId/roles`` per the admin
 * API-wiring convention. The backend matrix maps bare role keys
 * ("admin"/"officer"/…) to capability strings; the surface uses a
 * `Set<HubCapabilityKey>` per role.
 *
 * Mapping note: the backend's `HubCapability` enum and the frontend's
 * `HubCapabilityKey` are the same wire vocabulary — they both come
 * from the same source-of-truth list. The route does a defensive
 * filter on incoming strings to drop anything the surface doesn't know.
 */

import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  type HubCapabilityKey,
  type HubRoleRow,
  RolesPermissionsEditorSurface,
  RPE_CAPABILITIES,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type BareHubRole,
  type CapabilityMatrix,
  useCapabilityMatrix,
  useUpdateCapabilityMatrix,
} from "../lib/hubs.js";

const KNOWN_CAPS = new Set<string>(RPE_CAPABILITIES.map(([k]) => k));

const BUILTIN_ROLES: BareHubRole[] = [
  "admin",
  "officer",
  "moderator",
  "member",
  "observer",
];

function toRoles(matrix: CapabilityMatrix): HubRoleRow[] {
  return BUILTIN_ROLES.map((role) => ({
    key: role,
    builtin: true,
    capabilities: new Set<HubCapabilityKey>(
      (matrix.matrix[role] ?? [])
        .filter((c): c is HubCapabilityKey => KNOWN_CAPS.has(c)),
    ),
  }));
}

function fromRoles(
  rows: readonly HubRoleRow[],
): Record<BareHubRole, string[]> {
  const out: Record<BareHubRole, string[]> = {
    admin: [],
    officer: [],
    moderator: [],
    member: [],
    observer: [],
  };
  for (const row of rows) {
    if (BUILTIN_ROLES.includes(row.key as BareHubRole)) {
      out[row.key as BareHubRole] = Array.from(row.capabilities);
    }
  }
  return out;
}

export function RolesPermissionsEditor() {
  const { hubId } = useParams<{ hubId: string }>();
  useTopbar(() => ({ title: "Roles & permissions" }));

  const { data, isLoading, error, refetch } = useCapabilityMatrix(hubId);
  const update = useUpdateCapabilityMatrix(hubId);

  const initialRoles = useMemo(
    () => (data ? toRoles(data) : []),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={5} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load the capability matrix."
        message={error.message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <>
      {update.error ? (
        <SurfaceError
          title="Couldn’t save the matrix."
          message={update.error.message}
          onRetry={() => update.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <RolesPermissionsEditorSurface
        hubLabel="This hub"
        hubHref={`/hubs/${hubId ?? ""}/admin`}
        lastChangedAgo="—"
        lastChangedBy=""
        initialRoles={initialRoles}
        onSave={(next) => update.mutate(fromRoles(next))}
        onSaveAndApply={(next) => update.mutate(fromRoles(next))}
      />
    </>
  );
}
