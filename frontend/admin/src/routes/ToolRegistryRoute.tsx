/**
 * Tool Registry — admin route wrapping the shared
 * ToolRegistrySurface (H05) + the H07 NewTool / NewAltar modals
 * (Cluster A, surfaces 1 + 2).
 *
 * The H05 surface emits an `onNew(view)` intent — this route opens
 * the matching H07 modal in response and POSTs to the Phase 07
 * backend (`/api/v1/tools` from B106 / `/api/v1/altars` from B106)
 * on confirm.
 *
 * Closes B108-2e.
 */

import {
  type NewAltarModalPayload,
  type NewToolModalPayload,
  type RegistryView,
  type ToolPickerOption,
  type ToolRecordWire,
  NewAltarModal,
  NewToolModal,
  ToolRegistrySurface,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

function dimensionsFromPayload(
  d: NewToolModalPayload["dimensions"],
): Record<string, unknown> {
  // Drop null values — the backend stores only what the practitioner
  // supplied. Matches the H07 honesty rule: empty optionals submit as
  // null, not zero / empty string.
  const out: Record<string, unknown> = {};
  if (d.length_cm !== null) out.length_cm = d.length_cm;
  if (d.width_cm !== null) out.width_cm = d.width_cm;
  if (d.height_cm !== null) out.height_cm = d.height_cm;
  if (d.weight_g !== null) out.weight_g = d.weight_g;
  return out;
}

export function ToolRegistryRoute() {
  useTopbar(
    () => ({
      title: "Tool Registry",
      subtitle: "Your ritual implements and the altars they keep",
    }),
    [],
  );

  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [altarModalOpen, setAltarModalOpen] = useState(false);
  const [tools, setTools] = useState<ToolRecordWire[]>([]);

  const loadTools = useCallback(async () => {
    try {
      const rows = await apiMethods.listTools();
      setTools(rows);
    } catch {
      // Surface stays usable even if the list fails — the registry
      // surface itself handles its own empty state.
    }
  }, []);

  useEffect(() => {
    void loadTools();
  }, [loadTools]);

  const handleNew = useCallback((view: RegistryView) => {
    if (view === "tools") setToolModalOpen(true);
    else setAltarModalOpen(true);
  }, []);

  const handleToolSave = useCallback(
    async (payload: NewToolModalPayload) => {
      try {
        // The "Other" free-text label is appended to the name when
        // present — the backend has a single `name` field plus a
        // restricted `kind` enum. Per H07, "other" reveals the input
        // so the practitioner can label their unconventional kind.
        const name =
          payload.kind === "other" && payload.otherLabel
            ? `${payload.name} (${payload.otherLabel})`
            : payload.name;
        const row = await apiMethods.createTool({
          name,
          kind: payload.kind,
          materials: payload.materials,
          dimensions: dimensionsFromPayload(payload.dimensions),
          provenance: payload.provenance,
          acquisition_date: payload.acquisition_date,
          current_location: payload.current_location,
        });
        Toast.push({
          tone: "success",
          title: `Tool saved · ${row.name}`,
          body: "Consecration is recorded separately — link a working entry from the tool's detail view.",
        });
        await loadTools();
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save tool",
          body:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        });
      }
    },
    [loadTools],
  );

  const handleAltarSave = useCallback(
    async (payload: NewAltarModalPayload) => {
      try {
        const row = await apiMethods.createAltar({
          name: payload.name,
          description: payload.description,
          tool_ids: payload.tool_ids,
          arrangement_diagram_svg: payload.arrangement_diagram_svg,
          is_permanent: payload.is_permanent,
        });
        Toast.push({
          tone: "success",
          title: `Altar saved · ${row.name}`,
          body: "Linked workings can be added from the altar's detail view.",
        });
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save altar",
          body:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        });
      }
    },
    [],
  );

  const toolOptions: ToolPickerOption[] = tools.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
  }));

  return (
    <>
      <ToolRegistrySurface onNew={handleNew} />
      <NewToolModal
        open={toolModalOpen}
        onClose={() => setToolModalOpen(false)}
        onSave={handleToolSave}
      />
      <NewAltarModal
        open={altarModalOpen}
        onClose={() => setAltarModalOpen(false)}
        tools={toolOptions}
        onSave={handleAltarSave}
      />
    </>
  );
}
