/**
 * iCal Feed — admin route.
 *
 * Live-wired: GET/PATCH /api/v1/ical-feed. Toggling any include /
 * changing name / visibility flushes to the backend via PATCH; the
 * regenerate button hits POST /api/v1/ical-feed/regenerate to mint
 * a new feed URL path.
 */

import {
  type ICalFeedRecord,
  type ICalIncludeKey,
  type ICalVisibility,
  ICalFeedSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { apiClient } from "../data/api.js";

interface WireICalFeed {
  id: string;
  owner_id: string;
  name: string;
  include_resh: boolean;
  include_workings: boolean;
  include_pilgrimage_anniversaries: boolean;
  include_lunar_events: boolean;
  include_planetary_hours: boolean;
  include_custom: boolean;
  custom_cron: string | null;
  visibility: string;
  feed_url_path: string;
  connected_client_count?: number;
}

interface PatchICalFeed {
  name?: string;
  include_resh?: boolean;
  include_workings?: boolean;
  include_pilgrimage_anniversaries?: boolean;
  include_lunar_events?: boolean;
  include_planetary_hours?: boolean;
  include_custom?: boolean;
  visibility?: string;
}

function toRecord(w: WireICalFeed): ICalFeedRecord {
  return {
    feed_name: w.name,
    includes: {
      resh: w.include_resh,
      workings: w.include_workings,
      pilgrimage: w.include_pilgrimage_anniversaries,
      lunar: w.include_lunar_events,
      hours: w.include_planetary_hours,
      custom: w.include_custom,
    },
    visibility: w.visibility as ICalVisibility,
    feed_url:
      typeof window !== "undefined"
        ? `webcal://${window.location.host}${w.feed_url_path}`
        : `webcal://theourgia.com${w.feed_url_path}`,
    connected_count: w.connected_client_count ?? 0,
  };
}

const INCLUDE_MAP: Record<ICalIncludeKey, keyof PatchICalFeed> = {
  resh: "include_resh",
  workings: "include_workings",
  pilgrimage: "include_pilgrimage_anniversaries",
  lunar: "include_lunar_events",
  hours: "include_planetary_hours",
  custom: "include_custom",
};

export function ICalFeedRoute() {
  useTopbar(
    () => ({
      title: "Calendar feed",
      subtitle:
        "An iCal feed of your practice, for any external calendar.",
    }),
    [],
  );

  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ical-feed"],
    queryFn: async () =>
      apiClient.request<WireICalFeed>("/api/v1/ical-feed"),
    staleTime: 30_000,
  });

  const patchMutation = useMutation({
    mutationFn: async (patch: PatchICalFeed) =>
      apiClient.request<WireICalFeed>("/api/v1/ical-feed", {
        method: "PATCH",
        json: patch,
      }),
    onSuccess: (data) => {
      qc.setQueryData(["ical-feed"], data);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () =>
      apiClient.request<{ feed_url_path: string }>(
        "/api/v1/ical-feed/regenerate",
        { method: "POST", json: {} },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ical-feed"] });
    },
  });

  const record = useMemo<ICalFeedRecord>(() => {
    if (query.data) return toRecord(query.data);
    return {
      feed_name: "Loading…",
      includes: {
        resh: false,
        workings: false,
        pilgrimage: false,
        lunar: false,
        hours: false,
        custom: false,
      },
      visibility: "private",
      feed_url: "",
      connected_count: 0,
    };
  }, [query.data]);

  const handleChangeName = useCallback(
    (feed_name: string) => {
      patchMutation.mutate({ name: feed_name });
    },
    [patchMutation],
  );

  const handleToggleInclude = useCallback(
    (id: ICalIncludeKey, next: boolean) => {
      patchMutation.mutate({ [INCLUDE_MAP[id]]: next } as PatchICalFeed);
    },
    [patchMutation],
  );

  const handleChangeVisibility = useCallback(
    (v: ICalVisibility) => {
      patchMutation.mutate({ visibility: v });
    },
    [patchMutation],
  );

  const handleCopyUrl = useCallback(() => {
    if (record.feed_url && navigator.clipboard) {
      navigator.clipboard.writeText(record.feed_url).catch(() => {});
    }
    Toast.push({
      tone: "info",
      title: "URL copied",
      body: "Paste it into any iCal-compatible calendar client.",
    });
  }, [record.feed_url]);

  const handleRegenerate = useCallback(() => {
    regenerateMutation.mutate();
    Toast.push({
      tone: "info",
      title: "URL regenerated",
      body: "Existing clients will need to re-subscribe.",
    });
  }, [regenerateMutation]);

  return (
    <ICalFeedSurface
      record={record}
      onChangeName={handleChangeName}
      onToggleInclude={handleToggleInclude}
      onChangeVisibility={handleChangeVisibility}
      onCopyUrl={handleCopyUrl}
      onRegenerate={handleRegenerate}
    />
  );
}
