/**
 * Correspondence — admin route at ``/correspondences``.
 *
 * The web mirror of the phone's correspondence screen, two ways in (its §10;
 * NOTE_FROM_THE_PHONE-correspondences-v2.md):
 *
 * - **Look up** — a subject read down its categories, each source's value
 *   beside another's: the installed correspondence-table packs (Agrippa,
 *   Liber 777, read-only), and beside them the MAPPED columns of the
 *   practitioner's own canonical-scale charts, each under its column's own
 *   source.
 * - **Your charts** — the charts the practitioner authors: rows down a scale,
 *   columns each carrying their own source (OwnChartsEditor).
 */

import {
  CorrespondenceChart,
  type CorrespondenceTable,
  type OwnChart,
  fetchPackFeed,
  installedPackPayloads,
  mappedColumnTables,
  packToCorrespondenceTable,
  useTopbar,
} from "@theourgia/shared";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";
import { fetchDisabledModuleIds } from "../data/packSettings.js";
import { PracticePacks } from "../lib/PracticePacks.js";
import { SurfaceSkeleton } from "../lib/SurfaceSkeleton.js";
import { OwnChartsEditor } from "./OwnChartsEditor.js";

type Mode = "lookup" | "charts";

const MODE_BTN: CSSProperties = {
  padding: "7px 16px",
  border: "1px solid var(--line)",
  background: "var(--bg-2)",
  color: "var(--ink-soft)",
  fontFamily: "var(--font-ui)",
  fontSize: 13.5,
  cursor: "pointer",
};

export function CorrespondenceRoute() {
  useTopbar(
    () => ({
      title: "Correspondences",
      subtitle: "The metals, stones and perfumes a tradition sets under each",
    }),
    [],
  );

  const [mode, setMode] = useState<Mode>("lookup");
  const [packTables, setPackTables] = useState<CorrespondenceTable[] | null>(null);
  const [charts, setCharts] = useState<OwnChart[]>([]);
  // Bumped when a pack is installed in context, so the lookup re-reads.
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [feed, installed] = await Promise.all([
          fetchPackFeed(),
          apiMethods.bundlesInstalled(),
        ]);
        const slugs = installed.bundles.map((b) => b.slug);
        const found = await installedPackPayloads(
          feed,
          slugs,
          "correspondence-tables",
          await fetchDisabledModuleIds(),
        );
        const parsed = found
          .map((f) => packToCorrespondenceTable(f.payload))
          .filter((t): t is CorrespondenceTable => t !== null);
        if (!cancelled) setPackTables(parsed);
      } catch {
        if (!cancelled) setPackTables([]);
      }
    })();
    void (async () => {
      try {
        const res = await apiMethods.getMyCorrespondenceCharts();
        if (!cancelled) setCharts(res.charts);
      } catch {
        // The lookup still shows the packs; the editor reports its own load.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rev]);

  // The packs' tables, then the practitioner's mapped columns — each mapped
  // column one table under its own source, exactly as the phone merges them.
  const tables = useMemo(
    () => (packTables === null ? null : [...packTables, ...mappedColumnTables(charts)]),
    [packTables, charts],
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 6px" }}>
        <div style={{ display: "flex" }}>
          <button
            type="button"
            onClick={() => setMode("lookup")}
            aria-pressed={mode === "lookup"}
            style={{
              ...MODE_BTN,
              borderRadius: "var(--r-md, 10px) 0 0 var(--r-md, 10px)",
              ...(mode === "lookup"
                ? {
                    background: "var(--accent-soft)",
                    color: "var(--ink)",
                    borderColor: "var(--accent)",
                  }
                : {}),
            }}
          >
            Look up
          </button>
          <button
            type="button"
            onClick={() => setMode("charts")}
            aria-pressed={mode === "charts"}
            style={{
              ...MODE_BTN,
              marginLeft: -1,
              borderRadius: "0 var(--r-md, 10px) var(--r-md, 10px) 0",
              ...(mode === "charts"
                ? {
                    background: "var(--accent-soft)",
                    color: "var(--ink)",
                    borderColor: "var(--accent)",
                  }
                : {}),
            }}
          >
            Your charts
          </button>
        </div>
      </div>

      {mode === "lookup" ? (
        tables === null ? (
          <SurfaceSkeleton rowCount={5} />
        ) : (
          <>
            <CorrespondenceChart tables={tables} />
            {/* The correspondence packs themselves, installable in context. */}
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <PracticePacks
                kinds={["correspondence-table"]}
                onInstalled={() => setRev((r) => r + 1)}
              />
            </div>
          </>
        )
      ) : (
        <OwnChartsEditor onSaved={setCharts} />
      )}
    </div>
  );
}
