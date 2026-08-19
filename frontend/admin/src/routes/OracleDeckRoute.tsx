/**
 * Oracle decks — admin route at ``/decks``.
 *
 * The web reference for the deck packs (#87) — the last pack kind. The live draw
 * is on the Tarot surface, on its own built-in deck; this reads the deck packs
 * the account has *installed*, client-side, and shows each one's cards and
 * spreads. That closes the parity: the site can now read every pack kind the
 * phone can.
 */

import {
  type NamedDeckSet,
  OracleDeckReference,
  fetchPackFeed,
  installedPackPayloads,
  packToOracleDeck,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function OracleDeckRoute() {
  useTopbar(
    () => ({
      title: "Decks",
      subtitle: "The deck packs you hold — their cards, and the spreads they carry",
    }),
    [],
  );

  const [packs, setPacks] = useState<NamedDeckSet[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "oracle-deck");
        const parsed = found.map((f) => ({
          title: f.pack.title,
          pack: packToOracleDeck(f.payload),
        }));
        if (!cancelled) setPacks(parsed);
      } catch {
        if (!cancelled) setPacks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (packs === null) return <SurfaceSkeleton rowCount={4} />;
  return <OracleDeckReference packs={packs} />;
}
