/**
 * GroupRitualCoordination — admin route at ``/group-rituals/:id/run``.
 *
 * Wired to GET /api/v1/group-rituals/:id + /:id/fragments per the
 * admin API-wiring convention. POST /:id/fragments dispatches new
 * fragments; the cache invalidates and the surface re-renders.
 *
 * Participants list is queued — the backend has the data via
 * /:id (participant_ids on the ritual row) but presence-streaming
 * is the federation-transport layer's job. Until then the participants
 * pane stays at a placeholder showing only the organizer.
 */

import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  type GroupRitualFragment,
  type GroupRitualParticipant,
  GroupRitualCoordinationSurface,
  type GroupRitualStatus,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type Fragment as ApiFragment,
  type RitualStatus,
  useAddFragment,
  useFragments,
  useGroupRitual,
} from "../lib/groupRituals.js";

const BACKEND_TO_SURFACE_STATUS: Record<RitualStatus, GroupRitualStatus> = {
  draft: "countdown",
  invited: "countdown",
  in_progress: "in-progress",
  completed: "completed",
  cancelled: "completed",
};

function toSurfaceFragment(f: ApiFragment): GroupRitualFragment {
  return {
    id: f.id,
    did: f.author_id.slice(0, 8),
    time: new Date(f.posted_at_utc).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
    body: f.body,
  };
}

export function GroupRitualCoordination() {
  const { id } = useParams<{ id: string }>();
  useTopbar(() => ({ title: "Ritual in progress" }));

  const ritual = useGroupRitual(id);
  const fragments = useFragments(id);
  const addFragment = useAddFragment(id);

  const surfaceFragments = useMemo(
    () => (fragments.data ? fragments.data.map(toSurfaceFragment) : []),
    [fragments.data],
  );

  if (ritual.isLoading || fragments.isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  const error = ritual.error ?? fragments.error;
  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load the ritual."
        message={error.message}
        onRetry={() => {
          void ritual.refetch();
          void fragments.refetch();
        }}
      />
    );
  }

  if (!ritual.data) return null;

  const r = ritual.data;
  const scheduled = new Date(r.scheduled_for_utc);
  const participants: GroupRitualParticipant[] = [
    {
      id: r.organizer_id,
      initial: (r.organizer_id[0] ?? "·").toUpperCase(),
      name: "Organizer",
      presence: r.status === "in_progress" ? "in-ritual" : "joined",
    },
  ];

  return (
    <>
      {addFragment.error ? (
        <SurfaceError
          title="Couldn’t post your fragment."
          message={addFragment.error.message}
          onRetry={() => addFragment.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <GroupRitualCoordinationSurface
        ritualTitle={r.title}
        status={BACKEND_TO_SURFACE_STATUS[r.status]}
        trio={{
          localPrimary: scheduled.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
          utcPrimary: scheduled.toISOString().slice(11, 16),
          planetaryRuler: "Sun",
          isCurrent: r.status === "in_progress",
        }}
        participants={participants}
        scriptParagraphs={r.shared_script ? [r.shared_script] : []}
        fragments={surfaceFragments}
        canMarkCompleted={r.status === "in_progress"}
        onPostFragment={(body) => addFragment.mutate(body)}
      />
    </>
  );
}
