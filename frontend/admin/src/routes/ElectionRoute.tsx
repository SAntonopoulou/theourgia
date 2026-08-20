/**
 * Election rules — admin route at ``/elections``.
 *
 * The web reference for the election-rules packs (#87). The phone elects against
 * a chart; here the rules are read from the account's installed packs,
 * client-side, and shown as themselves — the matters, and the rulesets that read
 * them, clause by clause with the reason for each.
 */

import {
  ElectionReference,
  type ElectionTemplates,
  fetchPackFeed,
  installedPackPayloads,
  packToElectionTemplates,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { ElectionFinder } from "./ElectionFinder.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function ElectionRoute() {
  useTopbar(
    () => ({
      title: "Elections",
      subtitle: "The matters, and the rules that choose their hours — as reference",
    }),
    [],
  );

  const [templates, setTemplates] = useState<ElectionTemplates | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "election-templates");
        // Merge across installed election packs into one set of rules.
        const merged: ElectionTemplates = { matters: [], rulesets: [] };
        for (const f of found) {
          const t = packToElectionTemplates(f.payload);
          merged.matters.push(...t.matters);
          merged.rulesets.push(...t.rulesets);
        }
        if (!cancelled) setTemplates(merged);
      } catch {
        if (!cancelled) setTemplates({ matters: [], rulesets: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (templates === null) return <SurfaceSkeleton rowCount={5} />;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <ElectionFinder />
      <ElectionReference templates={templates} />
    </div>
  );
}
