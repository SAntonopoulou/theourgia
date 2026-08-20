/**
 * Directional frames — admin route at ``/frames``.
 *
 * The web reference for the phone's ritual compass (#87). A computer has no
 * needle, so this reads the account's installed directional-frame packs
 * client-side and shows each as a static rose + its winds' meanings — reference,
 * not a live compass.
 */

import {
  type DirectionalFrame,
  DirectionalFrameReference,
  fetchPackFeed,
  installedPackPayloads,
  packToFrames,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";
import { LiveCompass } from "./LiveCompass.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";

export function DirectionalFrameRoute() {
  useTopbar(
    () => ({
      title: "Directional frames",
      subtitle: "The quarters and their winds — a rose to read from",
    }),
    [],
  );

  const [frames, setFrames] = useState<DirectionalFrame[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(feed, slugs, "directional-frames");
        const parsed = found.flatMap((f) => packToFrames(f.payload));
        if (!cancelled) setFrames(parsed);
      } catch {
        if (!cancelled) setFrames([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (frames === null) return <SurfaceSkeleton rowCount={3} />;
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "var(--space-5, 24px)" }}>
      <LiveCompass />
      <DirectionalFrameReference frames={frames} />
    </div>
  );
}
