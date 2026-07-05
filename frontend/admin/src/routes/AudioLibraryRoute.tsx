/**
 * Audio Library — admin route wrapping AudioLibrarySurface.
 *
 * Live-wired: GET /api/v1/media?kind=audio populates the track list.
 * Play/pause state is owned by this route (the surface is controlled);
 * the actual HTMLAudioElement wiring for a source URL lands with the
 * media-serve endpoint (R2 signed URLs).
 */

import {
  type AudioTrack,
  AudioLibrarySurface,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

interface WireAudioAsset {
  id: string;
  filename: string;
  duration_seconds?: number;
  uploaded_at?: string;
  linked_kind?: string;
  linked_label?: string;
  sealed?: boolean;
}

function toTrack(a: WireAudioAsset): AudioTrack {
  const seconds = a.duration_seconds ?? 0;
  const duration = `${Math.floor(seconds / 60)}:${String(
    Math.round(seconds % 60),
  ).padStart(2, "0")}`;
  const date = a.uploaded_at
    ? new Date(a.uploaded_at).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
      })
    : "";
  const category = ((a.linked_kind as AudioTrack["category"]) ?? "working");
  return {
    id: a.id,
    title: a.filename.replace(/\.[^.]+$/, ""),
    meta_label: `${category}${a.linked_label ? ` · ${a.linked_label}` : ""}${
      date ? ` · ${date}` : ""
    }`,
    category,
    duration_label: duration,
    duration_seconds: seconds,
    sealed: a.sealed ?? false,
  };
}

export function AudioLibraryRoute() {
  useTopbar(
    () => ({
      title: "Audio library",
      subtitle: "Voces, ritual recordings, lectures — by ear.",
    }),
    [],
  );

  const query = useQuery({
    queryKey: ["media-audio"],
    queryFn: async () =>
      (await apiMethods.listMedia({ kind: "audio" })) as unknown as WireAudioAsset[],
    staleTime: 30_000,
  });

  const tracks = useMemo<AudioTrack[]>(
    () => (query.data ?? []).map(toTrack),
    [query.data],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
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
      tracks={tracks}
      active_id={activeId}
      is_playing={isPlaying}
      position_seconds={positionSeconds}
      onTogglePlay={handleTogglePlay}
      onScrub={handleScrub}
    />
  );
}
