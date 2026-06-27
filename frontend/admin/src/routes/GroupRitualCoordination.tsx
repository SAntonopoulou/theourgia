/**
 * GroupRitualCoordination — admin route at
 * ``/group-rituals/:id/run``.
 *
 * Renders the H08 §S3 Cluster A surface 9 against fixtures.
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * GET /api/v1/group-rituals/{id} — header + script + meta.
 *   * GET /api/v1/group-rituals/{id}/time?lat=&lng= — per-viewer
 *     planetary hour for the time trio.
 *   * GET /api/v1/group-rituals/{id}/fragments — chronological.
 *   * POST /api/v1/group-rituals/{id}/fragments — post one.
 *   * POST /api/v1/group-rituals/{id}/presence { presence:
 *     'completed' } — fired by Mark me as completed (one-way).
 */

import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  type GroupRitualFragment,
  type GroupRitualParticipant,
  GroupRitualCoordinationSurface,
  type GroupRitualStatus,
  useTopbar,
} from "@theourgia/shared";

const INITIAL_PARTICIPANTS: GroupRitualParticipant[] = [
  { id: "you", initial: "Σ", name: "You", presence: "in-ritual" },
  {
    id: "aurora",
    initial: "A",
    name: "Soror Aurora",
    presence: "in-ritual",
  },
  { id: "diotima", initial: "Δ", name: "Diotima", presence: "joined" },
  {
    id: "peregrina",
    initial: "P",
    name: "Peregrina",
    presence: "not-present",
  },
];

const INITIAL_FRAGMENTS: GroupRitualFragment[] = [
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

const SCRIPT = [
  "Hail to thee who art Ra in thy rising, even unto thee who art Ra in thy strength, who travellest over the heavens in thy bark at the uprising of the sun.",
  "Tahuti standeth in his splendour at the prow, and Ra-Hoor abideth at the helm. Hail unto thee from the abodes of night.",
];

export function GroupRitualCoordination() {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] =
    useState<GroupRitualParticipant[]>(INITIAL_PARTICIPANTS);
  const [fragments, setFragments] =
    useState<GroupRitualFragment[]>(INITIAL_FRAGMENTS);
  const [status] = useState<GroupRitualStatus>("in-progress");

  useTopbar(() => ({ title: "Ritual in progress" }));

  const youIsCompleted =
    participants.find((p) => p.id === "you")?.presence === "completed";

  return (
    <GroupRitualCoordinationSurface
      ritualTitle="Spring equinox — shared dawn adoration"
      status={status}
      trio={{
        localPrimary: "06:12",
        utcPrimary: "04:12",
        planetaryRuler: "Sun",
        isCurrent: true,
      }}
      participants={participants}
      scriptParagraphs={SCRIPT}
      fragments={fragments}
      canMarkCompleted={!youIsCompleted}
      onPostFragment={(body) => {
        // TODO Phase 12 — POST /fragments.
        // Local optimistic prepend so the new fragment appears
        // at the top of the stream immediately.
        const fragment: GroupRitualFragment = {
          id: `f-${Date.now()}`,
          did: "you",
          time: new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }),
          body,
        };
        setFragments((prev) => [fragment, ...prev]);
        // eslint-disable-next-line no-console
        console.info("[group-ritual-coordination] post fragment", id, body);
      }}
      onMarkCompleted={() => {
        // TODO Phase 12 — POST /presence { presence: 'completed' }.
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === "you" ? { ...p, presence: "completed" } : p,
          ),
        );
        // eslint-disable-next-line no-console
        console.info("[group-ritual-coordination] mark completed", id);
      }}
    />
  );
}
