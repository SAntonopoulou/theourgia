/**
 * GroupRitualScheduler — admin route at ``/group-rituals/new``.
 *
 * Wired to ``POST /api/v1/group-rituals`` per the admin API-wiring
 * convention. Participants + correspondences are local-state until
 * the surface's design includes per-row backend persistence (current
 * design accepts them as a single POST payload).
 *
 * The three-pin time trio's display values stay derived locally from
 * the chosen datetime — the per-viewer planetary-hour endpoint lands
 * with the federation transport when peers may want a peer-of-truth
 * hour calculation. For now the organizer's local zone is the only
 * pin shown.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  GroupRitualSchedulerSurface,
  type GroupRitualLocationKind,
  useTopbar,
} from "@theourgia/shared";

import { SurfaceError } from "../lib/SurfaceError.js";
import {
  type RitualLocation,
  useCreateRitual,
} from "../lib/groupRituals.js";

// Surface kind ↔ backend kind. Surface uses 3 keys (dispersed / virtual /
// physical); backend uses 3 keys (dispersed / convergent / hybrid).
// virtual ≈ convergent (everyone meets in a shared remote space);
// physical ≈ convergent too; dispersed is the simplest match. Until
// the two vocabularies unify, we collapse to backend's dispersed +
// convergent.
const SURFACE_KIND_TO_BACKEND: Record<GroupRitualLocationKind, RitualLocation> = {
  dispersed: "dispersed",
  virtual: "convergent",
  physical: "convergent",
};

export function GroupRitualScheduler() {
  const navigate = useNavigate();
  useTopbar(() => ({ title: "Schedule group ritual" }));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localDatetime, setLocalDatetime] = useState("");
  const [locationKind, setLocationKind] =
    useState<GroupRitualLocationKind>("dispersed");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [correspondences, setCorrespondences] = useState<string[]>([]);
  const [script, setScript] = useState("");

  const create = useCreateRitual();

  const utcIso = useMemo(() => {
    if (!localDatetime) return "";
    const d = new Date(localDatetime);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }, [localDatetime]);

  const trio = useMemo((): {
    localPrimary: string;
    localSecondary: string;
    utcPrimary: string;
    utcSecondary: string;
    planetaryRuler: "Sun";
    planetarySecondary: string;
    isCurrent: boolean;
  } => {
    if (!localDatetime) {
      return {
        localPrimary: "—",
        localSecondary: "Pick a date and time",
        utcPrimary: "—",
        utcSecondary: "",
        planetaryRuler: "Sun",
        planetarySecondary: "Pick a date and time",
        isCurrent: false,
      };
    }
    const d = new Date(localDatetime);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const local = d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const utc = `${d.toISOString().slice(11, 16)} UTC`;
    return {
      localPrimary: local,
      localSecondary: tz,
      utcPrimary: utc,
      utcSecondary: d.toUTCString().slice(5, 16),
      planetaryRuler: "Sun" as const,
      planetarySecondary: "Per-viewer hour from federation peer (queued)",
      isCurrent: false,
    };
  }, [localDatetime]);

  return (
    <>
      {create.error ? (
        <SurfaceError
          title="Couldn’t schedule the ritual."
          message={create.error.message}
          onRetry={() => create.reset()}
          retryLabel="Dismiss"
        />
      ) : null}
      <GroupRitualSchedulerSurface
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        localDatetime={localDatetime}
        onLocalDatetimeChange={setLocalDatetime}
        trio={trio}
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
          setCorrespondences((prev) =>
            prev.filter((_, i) => i !== idx),
          )
        }
        script={script}
        onScriptChange={setScript}
        onSaveDraft={() => {
          if (!utcIso) return;
          create.mutate(
            {
              title,
              description: description || null,
              scheduled_for_utc: utcIso,
              location: SURFACE_KIND_TO_BACKEND[locationKind],
              location_detail:
                locationAddress || locationUrl || null,
              shared_script: script || null,
              correspondences_payload: { items: correspondences },
            },
            {
              onSuccess: (data) => navigate(`/group-rituals/${data.id}`),
            },
          );
        }}
        onScheduleInvite={() => {
          if (!utcIso) return;
          create.mutate(
            {
              title,
              description: description || null,
              scheduled_for_utc: utcIso,
              location: SURFACE_KIND_TO_BACKEND[locationKind],
              location_detail:
                locationAddress || locationUrl || null,
              shared_script: script || null,
              correspondences_payload: { items: correspondences },
            },
            {
              onSuccess: (data) => navigate(`/group-rituals/${data.id}`),
            },
          );
        }}
      />
    </>
  );
}
