/**
 * ActivityPubSettings — admin route at ``/settings/activitypub``.
 *
 * Wired to GET/PATCH ``/api/v1/activitypub/settings`` per the admin
 * API-wiring convention.
 */

import { useMemo } from "react";

import {
  ActivityPubSettingsSurface,
  type ApsSettingsDraft,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type ApSettings,
  useApSettings,
  useUpdateApSettings,
} from "../lib/activitypub.js";

function toDraft(s: ApSettings): ApsSettingsDraft {
  return {
    enabled: s.enabled,
    displayName: s.display_name_override ?? "",
    bio: s.bio_override ?? "",
    approval: s.follower_approval,
    objectMappings: s.object_type_mapping,
    outbound: {
      create: s.broadcast_creates,
      update: s.broadcast_updates,
      delete: s.broadcast_deletes,
    },
  };
}

function fromDraft(d: ApsSettingsDraft): Parameters<
  ReturnType<typeof useUpdateApSettings>["mutate"]
>[0] {
  return {
    enabled: d.enabled,
    display_name_override: d.displayName || null,
    bio_override: d.bio || null,
    follower_approval: d.approval,
    broadcast_creates: d.outbound.create,
    broadcast_updates: d.outbound.update,
    broadcast_deletes: d.outbound.delete,
    object_type_mapping: { ...d.objectMappings },
  };
}

export function ActivityPubSettings() {
  useTopbar(() => ({ title: "Fediverse integration" }));

  const { data, isLoading, error, refetch } = useApSettings();
  const update = useUpdateApSettings();

  const initial = useMemo(
    () => (data ? toDraft(data) : undefined),
    [data],
  );

  if (isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load your Fediverse settings."
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
          title="Couldn’t save your changes."
          message={update.error.message}
          onRetry={() => update.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <ActivityPubSettingsSurface
        // The handle is rendered from instance-side data once the
        // backend exposes it. For now we leave it blank; the surface
        // shows a placeholder.
        webFingerHandle=""
        initial={initial}
        onSave={(draft) => {
          update.mutate(fromDraft(draft));
        }}
        onDiscard={() => {
          // Reset the draft to the last fetched state.
          void refetch();
        }}
      />
    </>
  );
}
