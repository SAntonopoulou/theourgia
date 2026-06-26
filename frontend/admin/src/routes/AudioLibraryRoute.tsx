/**
 * Audio Library — admin route wrapping the shared AudioLibrarySurface
 * (H07 §S3 surface 17).
 *
 * Phase 11 backend is unbuilt — the route holds a fixture set and
 * owns the play / pause / scrub state machine. The actual audio
 * element + waveform peak extraction lands later.
 */

import {
  type AudioTrack,
  AudioLibrarySurface,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";

const FIXTURE_TRACKS: AudioTrack[] = [
  {
    id: "brimo",
    title: "ΒΡΙΜΩ — sounding",
    meta_label: "voce · linked to Hekate · 15 Jun",
    category: "voce",
    duration_label: "0:42",
    duration_seconds: 42,
    sealed: false,
  },
  {
    id: "deipnon",
    title: "Deipnon — full rite",
    meta_label: "working · 15 Jun",
    category: "working",
    duration_label: "12:04",
    duration_seconds: 724,
    sealed: false,
  },
  {
    id: "iao",
    title: "ΙΑΩ — slow articulation",
    meta_label: "voce · 02 May",
    category: "voce",
    duration_label: "0:51",
    duration_seconds: 51,
    sealed: false,
  },
  {
    id: "oath",
    title: "The sealed oath — spoken",
    meta_label: "working · sealed",
    category: "working",
    duration_label: "3:18",
    duration_seconds: 198,
    sealed: true,
  },
  {
    id: "lecture",
    title: "On the planetary hours",
    meta_label: "lecture · 19 Apr",
    category: "lecture",
    duration_label: "31:50",
    duration_seconds: 1910,
    sealed: false,
  },
  {
    id: "banish",
    title: "Evening banishing",
    meta_label: "working · 12 Apr",
    category: "working",
    duration_label: "4:02",
    duration_seconds: 242,
    sealed: false,
  },
];

export function AudioLibraryRoute() {
  useTopbar(
    () => ({
      title: "Audio library",
      subtitle: "Voces, ritual recordings, lectures — by ear.",
    }),
    [],
  );

  const [activeId, setActiveId] = useState<string | null>("brimo");
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSeconds, setPositionSeconds] = useState(0);

  const handleTogglePlay = useCallback(
    (id: string) => {
      if (id !== activeId) {
        setActiveId(id);
        setIsPlaying(true);
        setPositionSeconds(0);
      } else {
        setIsPlaying((p) => !p);
      }
    },
    [activeId],
  );

  const handleScrub = useCallback((seconds: number) => {
    setPositionSeconds(seconds);
  }, []);

  return (
    <AudioLibrarySurface
      tracks={FIXTURE_TRACKS}
      active_id={activeId}
      is_playing={isPlaying}
      position_seconds={positionSeconds}
      onTogglePlay={handleTogglePlay}
      onScrub={handleScrub}
    />
  );
}
