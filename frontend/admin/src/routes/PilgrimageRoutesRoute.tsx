/**
 * Pilgrimage routes admin — b108-2he.
 *
 * Wires PilgrimageRoutesSurface to b108-2gx backend endpoints +
 * loads the site catalog to render the polyline preview.
 */

import {
  ConfirmDialog,
  PilgrimageRoutesSurface,
  type PilgrimageRouteDetail,
  type PilgrimageRouteSummary,
  PromptDialog,
  Skeleton,
  type StopCoord,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useEffect, useState } from "react";

import { apiMethods } from "../data/api.js";

function toastOk(title: string): void {
  Toast.push({ tone: "success", title });
}

function toastError(title: string, body: unknown): void {
  Toast.push({
    tone: "warning",
    title,
    body: body instanceof Error ? body.message : String(body ?? ""),
  });
}

interface RawSite {
  id: string;
  name: string;
  x_norm?: number;
  y_norm?: number;
  precision_level?: string;
}

interface RawSitesResponse {
  items?: RawSite[];
  sealed_count?: number;
}

export function PilgrimageRoutesRoute() {
  useTopbar(
    () => ({
      title: "Pilgrimage routes",
      subtitle: "Ordered sequences of sacred sites",
    }),
    [],
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [routes, setRoutes] = useState<PilgrimageRouteSummary[]>([]);
  const [activeRoute, setActiveRoute] = useState<PilgrimageRouteDetail | null>(
    null,
  );
  const [siteCatalog, setSiteCatalog] = useState<StopCoord[]>([]);

  const [creating, setCreating] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRoutes = useCallback(async () => {
    try {
      const rows = (await apiMethods.listPilgrimageRoutes()) as unknown as PilgrimageRouteSummary[];
      setRoutes(rows);
    } catch (e) {
      toastError("Could not load routes", e);
    }
  }, []);

  const loadRouteDetail = useCallback(async (id: string) => {
    try {
      const row = (await apiMethods.getPilgrimageRoute(id)) as unknown as PilgrimageRouteDetail;
      setActiveRoute(row);
    } catch (e) {
      toastError("Could not load route", e);
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const resp = (await apiMethods.listPilgrimageSites()) as unknown as RawSitesResponse;
      const items = resp.items ?? [];
      const catalog: StopCoord[] = items
        .filter(
          (s): s is RawSite & { x_norm: number; y_norm: number } =>
            typeof s.x_norm === "number" && typeof s.y_norm === "number",
        )
        .map((s) => ({
          site_id: s.id,
          name: s.name,
          x_norm: s.x_norm,
          y_norm: s.y_norm,
        }));
      setSiteCatalog(catalog);
    } catch (e) {
      toastError("Could not load sites", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadRoutes(), loadSites()]).finally(() =>
      setLoading(false),
    );
  }, [loadRoutes, loadSites]);

  const handleCreateSubmit = useCallback(
    async (name: string) => {
      setCreating(false);
      try {
        const created = (await apiMethods.createPilgrimageRoute({
          name,
        })) as unknown as PilgrimageRouteDetail;
        await loadRoutes();
        setActiveRoute(created);
        toastOk("Route created");
      } catch (e) {
        toastError("Could not create route", e);
      }
    },
    [loadRoutes],
  );

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await apiMethods.deletePilgrimageRoute(id);
      await loadRoutes();
      if (activeRoute?.id === id) setActiveRoute(null);
      toastOk("Route deleted");
    } catch (e) {
      toastError("Could not delete", e);
    }
  }, [activeRoute, deletingId, loadRoutes]);

  const handleSaveMetadata = useCallback(
    async (patch: Partial<PilgrimageRouteDetail>) => {
      if (!activeRoute) return;
      try {
        await apiMethods.updatePilgrimageRoute(
          activeRoute.id,
          patch as Record<string, unknown>,
        );
        await loadRouteDetail(activeRoute.id);
        await loadRoutes();
      } catch (e) {
        toastError("Could not save", e);
      }
    },
    [activeRoute, loadRouteDetail, loadRoutes],
  );

  const handleAddStop = useCallback(
    async (siteId: string) => {
      if (!activeRoute) return;
      try {
        await apiMethods.addPilgrimageRouteStop(activeRoute.id, {
          site_id: siteId,
        });
        await loadRouteDetail(activeRoute.id);
        toastOk("Stop added");
      } catch (e) {
        toastError("Could not add stop", e);
      }
    },
    [activeRoute, loadRouteDetail],
  );

  const handleRemoveStop = useCallback(
    async (stopId: string) => {
      if (!activeRoute) return;
      try {
        await apiMethods.deletePilgrimageRouteStop(activeRoute.id, stopId);
        await loadRouteDetail(activeRoute.id);
      } catch (e) {
        toastError("Could not remove stop", e);
      }
    },
    [activeRoute, loadRouteDetail],
  );

  const handleReorderStops = useCallback(
    async (stopIds: string[]) => {
      if (!activeRoute) return;
      try {
        await apiMethods.reorderPilgrimageRouteStops(activeRoute.id, stopIds);
        await loadRouteDetail(activeRoute.id);
      } catch (e) {
        toastError("Could not reorder", e);
      }
    },
    [activeRoute, loadRouteDetail],
  );

  if (loading) {
    return (
      <div style={{ padding: "var(--space-4)" }}>
        <Skeleton kind="text" width="60%" />
        <Skeleton kind="text" width="80%" />
      </div>
    );
  }

  return (
    <div style={{ padding: "var(--space-4)" }} data-route="pilgrimage-routes">
      <PilgrimageRoutesSurface
        routes={routes}
        activeRoute={activeRoute}
        siteCatalog={siteCatalog}
        onSelectRoute={(id) => void loadRouteDetail(id)}
        onCreateRoute={() => setCreating(true)}
        onDeleteRoute={(id) => setDeletingId(id)}
        onSaveRouteMetadata={(p) => void handleSaveMetadata(p)}
        onAddStop={(siteId) => void handleAddStop(siteId)}
        onRemoveStop={(stopId) => void handleRemoveStop(stopId)}
        onReorderStops={(ids) => void handleReorderStops(ids)}
      />

      <PromptDialog
        open={creating}
        title="New pilgrimage route"
        label="Name"
        placeholder="e.g. Eleusis Route"
        confirmLabel="Create"
        validate={(v) => (v.trim().length < 1 ? "Name required." : null)}
        onSubmit={(v) => void handleCreateSubmit(v.trim())}
        onCancel={() => setCreating(false)}
      />
      <ConfirmDialog
        open={deletingId !== null}
        tone="destructive"
        title="Delete this route?"
        body="This action can't be undone. The stops are removed too."
        confirmLabel="Delete route"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
