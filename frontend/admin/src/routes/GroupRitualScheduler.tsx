/**
 * GroupRitualScheduler — admin route at ``/group-rituals/new``.
 *
 * Renders the H08 §S3 Cluster A surface 8 (the worked example)
 * against fixtures. The three-pin time trio's display values
 * come pre-formatted from the consumer — in production these
 * come from the Phase 12 ``GET /api/v1/group-rituals/{id}/time
 * ?lat=&lng=`` endpoint that computes the planetary hour per-
 * VIEWER from their lat/long (Swiss Ephemeris).
 *
 * Wiring deferred to Phase 12 backend:
 *
 *   * POST /api/v1/group-rituals — Schedule + invite fan-out.
 *   * PATCH /api/v1/group-rituals/{id} — Save draft.
 *   * GET /api/v1/group-rituals/{id}/time?lat=&lng= — planetary
 *     hour per-participant.
 */

import { useState } from "react";

import {
  GroupRitualSchedulerSurface,
  type GroupRitualLocationKind,
  useTopbar,
} from "@theourgia/shared";

export function GroupRitualScheduler() {
  const [title, setTitle] = useState(
    "Spring equinox — shared dawn adoration",
  );
  const [description, setDescription] = useState(
    "Each of us greets the rising sun from our own ground, at the same moment, with the shared adoration below.",
  );
  const [localDatetime, setLocalDatetime] = useState("2026-03-20T06:12");
  const [locationKind, setLocationKind] =
    useState<GroupRitualLocationKind>("dispersed");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [participants, setParticipants] = useState<string[]>([
    "Soror Aurora",
    "Diotima",
    "did:theourgia:far.example:peregrina",
  ]);
  const [correspondences, setCorrespondences] = useState<string[]>([
    "A clear vessel of water",
    "Frankincense or copal",
    "East-facing window or open door",
  ]);
  const [script, setScript] = useState(
    "Hail to thee who art Ra in thy rising, even unto thee who art Ra in thy strength…",
  );

  useTopbar(() => ({ title: "Schedule group ritual" }));

  return (
    <GroupRitualSchedulerSurface
      title={title}
      onTitleChange={setTitle}
      description={description}
      onDescriptionChange={setDescription}
      localDatetime={localDatetime}
      onLocalDatetimeChange={setLocalDatetime}
      // TODO Phase 12 — these come from the per-viewer time
      // endpoint. Hard-coded here to match the .dc.html demo
      // state (Hour of the Sun · 1st hour of day, Europe/Athens).
      trio={{
        localPrimary: "20 Mar 2026 · 06:12",
        localSecondary: "Europe/Athens (EET)",
        utcPrimary: "04:12 UTC",
        utcSecondary: "20 Mar 2026",
        planetaryRuler: "Sun",
        planetarySecondary: "1st hour of day",
        isCurrent: true,
      }}
      locationKind={locationKind}
      onLocationKindChange={setLocationKind}
      locationAddress={locationAddress}
      onLocationAddressChange={setLocationAddress}
      locationUrl={locationUrl}
      onLocationUrlChange={setLocationUrl}
      participants={participants}
      onAddParticipant={(entry) =>
        setParticipants((prev) => [...prev, entry])
      }
      onRemoveParticipant={(idx) =>
        setParticipants((prev) => prev.filter((_, i) => i !== idx))
      }
      correspondences={correspondences}
      onAddCorrespondence={() =>
        setCorrespondences((prev) => [...prev, "New item"])
      }
      onRemoveCorrespondence={(idx) =>
        setCorrespondences((prev) => prev.filter((_, i) => i !== idx))
      }
      script={script}
      onScriptChange={setScript}
      onLinkSigil={() => {
        // TODO Phase 12 — open the sigil picker (B92 → B91 handoff).
        // eslint-disable-next-line no-console
        console.info("[group-ritual] link sigil");
      }}
      onLinkVoce={() => {
        // TODO Phase 12 — open the voce picker.
        // eslint-disable-next-line no-console
        console.info("[group-ritual] link voce");
      }}
      onSaveDraft={() => {
        // TODO Phase 12 — PATCH state:'draft'.
        // eslint-disable-next-line no-console
        console.info("[group-ritual] save draft");
      }}
      onScheduleInvite={() => {
        // TODO Phase 12 — POST state:'scheduled' + fan-out invites.
        // eslint-disable-next-line no-console
        console.info("[group-ritual] schedule + invite");
      }}
    />
  );
}
