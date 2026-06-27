/**
 * GroupRitualPostMortem — admin route at ``/group-rituals/:id``.
 *
 * Renders the H08 §S3 Cluster A surface 10 against fixtures.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/group-rituals/{id} — full record (status,
 *     script, fragments).
 *   * GET /api/v1/group-rituals/{id}/reflections — caller-side.
 *   * POST /api/v1/group-rituals/{id}/reflection { body } —
 *     write-once submit.
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type GroupRitualFrozenFragment,
  type GroupRitualReflection,
  GroupRitualPostMortemSurface,
  useTopbar,
} from "@theourgia/shared";

const FRAGMENTS: GroupRitualFrozenFragment[] = [
  {
    id: "f-3",
    did: "aurora.example",
    time: "06:14",
    body: "The light just cleared the ridge. I can feel the others.",
  },
  {
    id: "f-2",
    did: "hearth.sophia.example",
    time: "06:13",
    body: "Vessel filled, incense lit. Beginning.",
  },
  {
    id: "f-1",
    did: "terra.example",
    time: "06:12",
    body: "Present at the eastern door.",
  },
];

const INITIAL_REFLECTIONS: GroupRitualReflection[] = [
  {
    participantId: "aurora",
    initial: "A",
    name: "Soror Aurora",
    body:
      "The sense of the others holding the same words at the same instant was unmistakable. I have never felt the dawn adoration carry like that.",
  },
];

const SCRIPT = [
  "Hail to thee who art Ra in thy rising, even unto thee who art Ra in thy strength, who travellest over the heavens in thy bark at the uprising of the sun.",
  "Tahuti standeth in his splendour at the prow, and Ra-Hoor abideth at the helm. Hail unto thee from the abodes of night.",
];

export function GroupRitualPostMortem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reflections, setReflections] =
    useState<GroupRitualReflection[]>(INITIAL_REFLECTIONS);
  const [viewerHasReflected, setViewerHasReflected] = useState(false);

  useTopbar(() => ({ title: "Ritual post-mortem" }));

  return (
    <GroupRitualPostMortemSurface
      ritualTitle="Spring equinox — shared dawn adoration"
      completedAtLabel="20 Mar 2026"
      trio={{
        localPrimary: "06:12",
        utcPrimary: "04:12",
        planetaryRuler: "Sun",
        isCurrent: false,
      }}
      egregore={{
        entityName: "The Dawn Companion",
        entityHref: "/entities/the-dawn-companion",
      }}
      scriptParagraphs={SCRIPT}
      fragments={FRAGMENTS}
      existingReflections={reflections}
      viewerCanReflect={!viewerHasReflected}
      onSubmitReflection={(body) => {
        // TODO Phase 12 — POST /reflection.
        // Optimistic update: render the viewer's reflection
        // immediately and hide the form.
        setReflections((prev) => [
          ...prev,
          {
            participantId: "you",
            initial: "Σ",
            name: "You",
            body,
          },
        ]);
        setViewerHasReflected(true);
        // eslint-disable-next-line no-console
        console.info("[group-ritual-post-mortem] submit reflection", id, body);
      }}
      onOpenAsEntry={() => {
        // TODO Phase 12 — create a personal entry from this
        // ritual + navigate to /editor/{newEntryId}.
        // eslint-disable-next-line no-console
        console.info("[group-ritual-post-mortem] open as entry", id);
        navigate("/editor");
      }}
    />
  );
}
