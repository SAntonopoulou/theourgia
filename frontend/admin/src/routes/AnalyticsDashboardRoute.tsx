/**
 * Analytics Dashboard — admin route wrapping
 * AnalyticsDashboardSurface (H06 §S7.7).
 *
 * Wires to the B123 endpoints:
 *   GET  /api/v1/analytics/today              (hero strip)
 *   POST /api/v1/analytics/timeseries          (recent-activity timeline)
 *   POST /api/v1/analytics/heatmap             (two heatmap panels)
 *   GET  /api/v1/studies?limit=5               (saved-studies rail)
 *
 * Patterns are placeholders until B124 (digest) ships — the surface
 * renders an empty observational copy when they're absent.
 */

import {
  type AnalyticsScope,
  type HeatmapPanel,
  type HeroStat,
  type PatternRow,
  type SavedStudyTile,
  type TimelineDay,
  AnalyticsDashboardSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

interface ApiTimeseries {
  points: { bucket: string; count: number }[];
  sample_size: number;
  small_sample: boolean;
}

interface ApiHeatmap {
  cells: { x: string; y: string; value: number }[];
  sample_size: number;
  small_sample: boolean;
}

interface ApiToday {
  entries_today: number;
  workings_today: number;
  syncs_today: number;
}

interface ApiStudy {
  id: string;
  name: string;
  kind: string;
  updated_at: string;
}

function granularityFor(scope: AnalyticsScope): "day" | "week" | "month" {
  if (scope === "today" || scope === "week") return "day";
  if (scope === "month") return "day";
  return "month";
}

function timeWindow(scope: AnalyticsScope): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  const to = now;
  if (scope === "today") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to,
    };
  }
  if (scope === "week") {
    return {
      from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      to,
    };
  }
  if (scope === "month") {
    return {
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to,
    };
  }
  if (scope === "year") {
    return {
      from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      to,
    };
  }
  return { from: null, to: null };
}

export function AnalyticsDashboardRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Analytics",
      subtitle:
        "Your practice, treated as evidence — sample sizes always shown.",
    }),
    [],
  );

  const [scope, setScope] = useState<AnalyticsScope>("week");
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<ApiToday | null>(null);
  const [tsEntries, setTsEntries] = useState<ApiTimeseries | null>(null);
  const [tsSyncs, setTsSyncs] = useState<ApiTimeseries | null>(null);
  const [hmWeekdayCategory, setHmWeekdayCategory] =
    useState<ApiHeatmap | null>(null);
  const [hmCategoryIntensity, setHmCategoryIntensity] =
    useState<ApiHeatmap | null>(null);
  const [studies, setStudies] = useState<ApiStudy[]>([]);

  const loadAll = useCallback(
    async (s: AnalyticsScope) => {
      setLoading(true);
      const win = timeWindow(s);
      const tsBody = (subject: "entry" | "synchronicity") => ({
        subject,
        granularity: granularityFor(s),
        ...(win.from ? { from: win.from.toISOString() } : {}),
        ...(win.to ? { to: win.to.toISOString() } : {}),
      });

      try {
        const [todayR, entriesR, syncsR, hm1, hm2, studiesR] =
          await Promise.all([
            apiClient.request<ApiToday>(
              "/api/v1/analytics/today",
              { method: "GET" },
            ),
            apiClient.request<ApiTimeseries>(
              "/api/v1/analytics/timeseries",
              { method: "POST", json: tsBody("entry") },
            ),
            apiClient.request<ApiTimeseries>(
              "/api/v1/analytics/timeseries",
              { method: "POST", json: tsBody("synchronicity") },
            ),
            apiClient.request<ApiHeatmap>(
              "/api/v1/analytics/heatmap",
              {
                method: "POST",
                json: {
                  subject: "synchronicity",
                  x_axis: "weekday",
                  y_axis: "category",
                  value_axis: "count",
                },
              },
            ),
            apiClient.request<ApiHeatmap>(
              "/api/v1/analytics/heatmap",
              {
                method: "POST",
                json: {
                  subject: "synchronicity",
                  x_axis: "category",
                  y_axis: "intensity_bucket",
                  value_axis: "count",
                },
              },
            ),
            apiClient.request<ApiStudy[]>(
              "/api/v1/studies?limit=5",
              { method: "GET" },
            ),
          ]);
        setToday(todayR);
        setTsEntries(entriesR);
        setTsSyncs(syncsR);
        setHmWeekdayCategory(hm1);
        setHmCategoryIntensity(hm2);
        setStudies(studiesR);
      } catch (err) {
        Toast.push({
          tone: "info",
          title: "Analytics partially loaded",
          body: String((err as Error).message ?? err),
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadAll(scope);
  }, [scope, loadAll]);

  const heroStats: HeroStat[] = useMemo(() => {
    return [
      { value: String(today?.entries_today ?? 0), label: "entries today" },
      { value: String(today?.workings_today ?? 0), label: "workings today" },
      { value: String(today?.syncs_today ?? 0), label: "synchronicities today" },
    ];
  }, [today]);

  // Merge the two series into per-bucket bars.
  const timelineDays: TimelineDay[] = useMemo(() => {
    const buckets = new Set<string>();
    (tsEntries?.points ?? []).forEach((p) => buckets.add(p.bucket));
    (tsSyncs?.points ?? []).forEach((p) => buckets.add(p.bucket));
    const sorted = Array.from(buckets).sort();
    const lookup = (
      series: { bucket: string; count: number }[] | undefined,
      bucket: string,
    ): number => {
      const hit = (series ?? []).find((p) => p.bucket === bucket);
      return hit ? hit.count : 0;
    };
    return sorted.map((b) => ({
      label: b.slice(-5),
      bars: [
        { series: "entries", count: lookup(tsEntries?.points, b) },
        { series: "syncs", count: lookup(tsSyncs?.points, b) },
      ],
    }));
  }, [tsEntries, tsSyncs]);

  const timelineLegend = useMemo(
    () => [
      { series: "entries", label: "Entries", color: "var(--chart-1)" },
      { series: "syncs", label: "Synchronicities", color: "var(--chart-2)" },
    ],
    [],
  );

  const heatmapHour: HeatmapPanel | null = useMemo(() => {
    if (!hmWeekdayCategory) return null;
    return {
      title: "Synchronicities · weekday × category",
      caption:
        "Cell shade = count · planetary-hour heatmap arrives when those columns materialise.",
      cells: hmWeekdayCategory.cells,
      footnote: `Computed from your local journal · n=${hmWeekdayCategory.sample_size}${hmWeekdayCategory.small_sample ? " · small sample" : ""}`,
    };
  }, [hmWeekdayCategory]);

  const heatmapLunar: HeatmapPanel | null = useMemo(() => {
    if (!hmCategoryIntensity) return null;
    return {
      title: "Synchronicities · category × intensity",
      caption:
        "Cell shade = count · lunar-phase heatmap arrives when those columns materialise.",
      cells: hmCategoryIntensity.cells,
      footnote: `Computed from your local journal · n=${hmCategoryIntensity.sample_size}${hmCategoryIntensity.small_sample ? " · small sample" : ""}`,
    };
  }, [hmCategoryIntensity]);

  const patterns: PatternRow[] = useMemo(() => {
    // Patterns ship empty until B124 digest lands; the surface
    // renders an observational empty state when this list is [].
    return [];
  }, []);

  const savedStudies: SavedStudyTile[] = useMemo(
    () =>
      studies.slice(0, 5).map((s) => ({
        id: s.id,
        name: s.name,
        meta:
          s.kind === "query_builder"
            ? "saved query"
            : s.kind === "gematria_search"
              ? "gematria search"
              : "calculation",
      })),
    [studies],
  );

  const handleOpenStudy = useCallback(
    (id: string) => navigate(`/studies/${id}`),
    [navigate],
  );
  const handleNewStudy = useCallback(
    () => navigate("/query"),
    [navigate],
  );
  const handleViewMatching = useCallback(
    (id: string) => {
      Toast.push({
        tone: "info",
        title: "View matching",
        body: `Pattern drilldown wires alongside the weekly digest (B124). Selected ${id}.`,
      });
    },
    [],
  );
  const handleCellClick = useCallback(
    (panel: "hour" | "lunar", x: string, y: string) => {
      Toast.push({
        tone: "info",
        title: `${panel} · ${x} / ${y}`,
        body: "Per-cell drilldown wires once the executor's group-by surface returns ids.",
      });
    },
    [],
  );

  return (
    <AnalyticsDashboardSurface
      scope={scope}
      hero_stats={heroStats}
      timeline_days={timelineDays}
      timeline_legend={timelineLegend}
      patterns={patterns}
      heatmap_hour={heatmapHour}
      heatmap_lunar={heatmapLunar}
      saved_studies={savedStudies}
      loading={loading}
      onScopeChange={(s) => setScope(s)}
      onOpenStudy={handleOpenStudy}
      onNewStudy={handleNewStudy}
      onViewMatching={handleViewMatching}
      onHeatmapCellClick={handleCellClick}
    />
  );
}
