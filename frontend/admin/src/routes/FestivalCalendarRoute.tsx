/**
 * Festival calendar — admin route at ``/festivals``.
 *
 * The web reference for the calendar packs (#87). The phone marks today against
 * the sky; here each installed calendar is read client-side and shown as
 * reference — the months as it counts them, and the days it keeps, each with
 * when in the cycle it falls and what it is for.
 */

import {
  FestivalCalendarReference,
  type NamedCalendar,
  fetchPackFeed,
  installedPackPayloads,
  packToFestivalCalendar,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function FestivalCalendarRoute() {
  useTopbar(
    () => ({
      title: "Festivals",
      subtitle: "The days a tradition keeps — when each falls, and what it is for",
    }),
    [],
  );

  const [calendars, setCalendars] = useState<NamedCalendar[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "festival-calendar");
        const parsed = found.map((f) => ({
          title: f.pack.title,
          calendar: packToFestivalCalendar(f.payload),
        }));
        if (!cancelled) setCalendars(parsed);
      } catch {
        if (!cancelled) setCalendars([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (calendars === null) return <SurfaceSkeleton rowCount={4} />;
  return <FestivalCalendarReference calendars={calendars} />;
}
