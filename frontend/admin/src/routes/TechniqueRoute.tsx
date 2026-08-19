/**
 * Techniques — admin route at ``/techniques``.
 *
 * The web reference for the timing techniques (#87). The phone runs profection,
 * zodiacal releasing and the solar return against a chart; here they are read
 * from the account's installed astro-technique packs, client-side, and shown as
 * the procedure the sources give — not computed, referenced.
 */

import {
  type Technique,
  TechniqueReference,
  fetchPackFeed,
  installedPackPayloads,
  packToTechniques,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function TechniqueRoute() {
  useTopbar(
    () => ({
      title: "Techniques",
      subtitle: "How the year and the life are timed — the procedure, to read from",
    }),
    [],
  );

  const [techniques, setTechniques] = useState<Technique[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "astro-techniques");
        const parsed = found.flatMap((f) => packToTechniques(f.payload));
        if (!cancelled) setTechniques(parsed);
      } catch {
        if (!cancelled) setTechniques([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (techniques === null) return <SurfaceSkeleton rowCount={3} />;
  return <TechniqueReference techniques={techniques} />;
}
