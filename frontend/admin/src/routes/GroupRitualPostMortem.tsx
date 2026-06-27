/**
 * GroupRitualPostMortem — admin route at ``/group-rituals/:id``.
 *
 * Wired to GET /api/v1/group-rituals/:id + /:id/fragments +
 * /:id/reflections + POST /:id/reflection per the admin API-wiring
 * convention.
 */

import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type GroupRitualFrozenFragment,
  type GroupRitualReflection,
  GroupRitualPostMortemSurface,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import {
  type Fragment as ApiFragment,
  type Reflection as ApiReflection,
  useAddReflection,
  useFragments,
  useGroupRitual,
  useReflections,
} from "../lib/groupRituals.js";

function toFragment(f: ApiFragment): GroupRitualFrozenFragment {
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

function toReflection(r: ApiReflection): GroupRitualReflection {
  return {
    participantId: r.author_id,
    initial: (r.author_id[0] ?? "·").toUpperCase(),
    name: "Participant",
    body: r.body,
  };
}

export function GroupRitualPostMortem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Ritual post-mortem" }));

  const ritual = useGroupRitual(id);
  const fragments = useFragments(id);
  const reflections = useReflections(id);
  const addReflection = useAddReflection(id);

  const surfaceFragments = useMemo(
    () => (fragments.data ? fragments.data.map(toFragment) : []),
    [fragments.data],
  );
  const surfaceReflections = useMemo(
    () => (reflections.data ? reflections.data.map(toReflection) : []),
    [reflections.data],
  );

  if (ritual.isLoading || fragments.isLoading || reflections.isLoading) {
    return <SurfaceSkeleton rowCount={4} />;
  }

  const error = ritual.error ?? fragments.error ?? reflections.error;
  if (error) {
    return (
      <SurfaceError
        title="Couldn’t load the ritual."
        message={error.message}
        onRetry={() => {
          void ritual.refetch();
          void fragments.refetch();
          void reflections.refetch();
        }}
      />
    );
  }

  if (!ritual.data) return null;

  const r = ritual.data;
  const scheduled = new Date(r.scheduled_for_utc);

  return (
    <>
      {addReflection.error ? (
        <SurfaceError
          title="Couldn’t post your reflection."
          message={addReflection.error.message}
          onRetry={() => addReflection.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <GroupRitualPostMortemSurface
        ritualTitle={r.title}
        completedAtLabel={scheduled.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        trio={{
          localPrimary: scheduled.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
          utcPrimary: scheduled.toISOString().slice(11, 16),
          planetaryRuler: "Sun",
          isCurrent: false,
        }}
        egregore={
          r.egregore_entity_id
            ? {
                entityName: "Egregore",
                entityHref: `/entities/${r.egregore_entity_id}`,
              }
            : undefined
        }
        scriptParagraphs={r.shared_script ? [r.shared_script] : []}
        fragments={surfaceFragments}
        existingReflections={surfaceReflections}
        viewerCanReflect={r.status === "completed"}
        onSubmitReflection={(body) => addReflection.mutate(body)}
        onOpenAsEntry={() => navigate("/editor")}
      />
    </>
  );
}
