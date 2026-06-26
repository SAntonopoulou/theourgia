/**
 * Query Builder — admin route wrapping QueryBuilderSurface
 * (H06 §S7.8).
 *
 * Wires to the B121/B122 backend:
 *   POST /api/v1/analytics/query        (live preview)
 *   POST /api/v1/studies                (Save as study)
 *
 * The surface holds the filter rows as plain strings; this route
 * coerces them to the DSL value type and assembles the JSON
 * payload that the executor expects.
 */

import {
  type ExecutedQueryResult,
  type QBAxis,
  type QBFilterRow,
  type QBSubject,
  QueryBuilderSurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "../data/api.js";

// Axis catalog — every axis the B122 executor materialises today.
// Astrological / calendar axes are intentionally absent until the
// executor stops raising on them (the surface even has an inline
// note explaining the wait).
const AXES: QBAxis[] = [
  {
    field: "entry.entry_type",
    label: "Entry type",
    subjects: ["entry", "working", "divination"],
    type: "string",
  },
  {
    field: "entry.body_text",
    label: "Body text",
    subjects: ["entry", "working", "divination"],
    type: "string",
  },
  {
    field: "entry.visibility",
    label: "Visibility",
    subjects: ["entry", "working", "divination"],
    type: "string",
  },
  {
    field: "entry.created_at",
    label: "Created at",
    subjects: ["entry", "working", "divination"],
    type: "datetime",
  },
  {
    field: "synchronicity.category",
    label: "Category",
    subjects: ["synchronicity"],
    type: "string",
  },
  {
    field: "synchronicity.intensity",
    label: "Intensity",
    subjects: ["synchronicity"],
    type: "int",
  },
  {
    field: "synchronicity.occurred_at",
    label: "Occurred at",
    subjects: ["synchronicity"],
    type: "datetime",
  },
];

type AnalyticsQueryResponse = {
  total_rows: number;
  sealed_excluded_count: number;
  rows: {
    id: string;
    created_at?: string;
    title?: string;
    entry_type?: string;
    description?: string;
    occurred_at?: string;
    category?: string;
    intensity?: number;
  }[];
};

function coerceValue(axisType: QBAxis["type"], cmp: string, raw: string): unknown {
  if (cmp === "in" || cmp === "nin") {
    // Comma-separated list.
    return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }
  if (cmp === "between") {
    const parts = raw.split(",").map((s) => s.trim());
    if (parts.length !== 2) return [raw, raw];
    if (axisType === "int") return parts.map((p) => parseInt(p, 10));
    if (axisType === "float") return parts.map((p) => parseFloat(p));
    return parts;
  }
  if (axisType === "int") return parseInt(raw, 10);
  if (axisType === "float") return parseFloat(raw);
  if (axisType === "bool") return raw === "true";
  return raw;
}

function buildPayload(
  subject: QBSubject,
  filters: readonly QBFilterRow[],
  axesByField: Map<string, QBAxis>,
): Record<string, unknown> {
  return {
    version: 1,
    subject,
    filters: filters.map((f) => {
      const axis = axesByField.get(f.field);
      const value = axis
        ? coerceValue(axis.type, f.cmp, f.value)
        : f.value;
      return { field: f.field, cmp: f.cmp, value };
    }),
  };
}

function rowsToResult(api: AnalyticsQueryResponse): ExecutedQueryResult {
  return {
    total_rows: api.total_rows,
    sealed_excluded_count: api.sealed_excluded_count,
    rows: api.rows.map((r) => ({
      id: r.id,
      date_label: (r.created_at ?? r.occurred_at ?? "").slice(0, 10),
      title:
        r.title ??
        r.description ??
        r.entry_type ??
        r.category ??
        "(no title)",
      meta:
        r.entry_type
          ? r.entry_type
          : r.category
            ? r.category
            : undefined,
    })),
  };
}

export function QueryBuilderRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Query Builder",
      subtitle:
        "A question, chained from filters; the answer with its sample size.",
    }),
    [],
  );

  const [result, setResult] = useState<ExecutedQueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  // Keep the last-run payload around so Save-as-Study can reuse it.
  const [lastSubject, setLastSubject] = useState<QBSubject>("entry");
  const [lastFilters, setLastFilters] = useState<readonly QBFilterRow[]>([]);

  const axesByField = new Map<string, QBAxis>(
    AXES.map((a) => [a.field, a]),
  );

  const handleRun = useCallback(
    (payload: { subject: QBSubject; filters: readonly QBFilterRow[] }) => {
      setLoading(true);
      setLastSubject(payload.subject);
      setLastFilters(payload.filters);
      const dsl = buildPayload(payload.subject, payload.filters, axesByField);
      apiClient
        .request<AnalyticsQueryResponse>("/api/v1/analytics/query", {
          method: "POST",
          json: dsl,
        })
        .then((api) => setResult(rowsToResult(api)))
        .catch((err) => {
          Toast.push({
            tone: "info",
            title: "Query failed",
            body: String((err as Error).message ?? err),
          });
          setResult(null);
        })
        .finally(() => setLoading(false));
    },
    // axesByField rebuilds each render but its entries are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSave = useCallback(
    (payload: {
      name: string;
      description: string;
      subject: QBSubject;
      filters: readonly QBFilterRow[];
      materialise_daily: boolean;
    }) => {
      const dsl = buildPayload(payload.subject, payload.filters, axesByField);
      apiClient
        .request<{ id: string }>("/api/v1/studies", {
          method: "POST",
          json: {
            name: payload.name,
            description: payload.description,
            kind: "query_builder",
            query: dsl,
          },
        })
        .then((s) => {
          Toast.push({
            tone: "info",
            title: "Study saved",
            body: payload.materialise_daily
              ? "Daily materialise is queued — the Studies index will show fresh counts."
              : "Open it from Studies to re-run later.",
          });
          navigate(`/studies/${s.id}`);
        })
        .catch((err) => {
          Toast.push({
            tone: "info",
            title: "Save failed",
            body: String((err as Error).message ?? err),
          });
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate],
  );

  const handleExportCsv = useCallback(() => {
    if (lastFilters.length === 0) return;
    const dsl = buildPayload(lastSubject, lastFilters, axesByField);
    // The B122 endpoint doesn't ship a /csv variant yet (gematria
    // search has its own). For now toast a friendly explainer.
    void dsl;
    Toast.push({
      tone: "info",
      title: "CSV export",
      body: "CSV download for the executor lands with B123 (analytics aggregates).",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSubject, lastFilters]);

  const handleOpenResult = useCallback(
    (id: string) => {
      if (lastSubject === "synchronicity") {
        navigate(`/synchronicities`);
        Toast.push({
          tone: "info",
          title: "Open synchronicity",
          body: `Detail view ships in a follow-up. Selected ${id}.`,
        });
        return;
      }
      navigate(`/journal/${id}`);
    },
    [navigate, lastSubject],
  );

  return (
    <QueryBuilderSurface
      axes={AXES}
      result={result}
      loading={loading}
      onRun={handleRun}
      onSave={handleSave}
      onExportCsv={handleExportCsv}
      onOpenResult={handleOpenResult}
    />
  );
}
