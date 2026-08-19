/**
 * Correspondence — admin route at ``/correspondences``.
 *
 * The web mirror of the phone's correspondence charts (#87). Reads the account's
 * installed correspondence-table packs (Agrippa, Liber 777) client-side from the
 * feed and lays their sources side by side: a subject read down its categories,
 * each source's value beside another's. No backend — pure client materialization.
 */

import {
  CorrespondenceChart,
  type CorrespondenceTable,
  fetchPackFeed,
  installedPackPayloads,
  packToCorrespondenceTable,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function CorrespondenceRoute() {
  useTopbar(
    () => ({
      title: "Correspondences",
      subtitle: "The metals, stones and perfumes a tradition sets under each",
    }),
    [],
  );

  const [tables, setTables] = useState<CorrespondenceTable[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "correspondence-tables");
        const parsed = found
          .map((f) => packToCorrespondenceTable(f.payload))
          .filter((t): t is CorrespondenceTable => t !== null);
        if (!cancelled) setTables(parsed);
      } catch {
        if (!cancelled) setTables([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (tables === null) return <SurfaceSkeleton rowCount={5} />;
  return <CorrespondenceChart tables={tables} />;
}
