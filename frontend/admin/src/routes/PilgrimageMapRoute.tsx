/**
 * Pilgrimage Map — admin route wrapping PilgrimageMapSurface.
 *
 * Live-wired: GET /api/v1/pilgrimage-sites populates the map + sealed
 * count. Individual site detail is fetched on open via
 * GET /api/v1/pilgrimage-sites/{id}. Add-place POSTs to the same
 * collection; requantize hits POST .../{id}/requantize.
 */

import {
  type AddPlaceDraft,
  AddPlaceModal,
  type PilgrimageSite,
  PilgrimageMapSurface,
  type SacredSiteRecord,
  SacredSiteSurface,
  type SiteRequantizeChoice,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { apiMethods } from "../data/api.js";

interface WirePilgrimageSite {
  id: string;
  name: string;
  kind: string;
  x_norm?: number;
  y_norm?: number;
  recorded_precision?: string;
  sealed?: boolean;
}

interface WirePilgrimageListResponse {
  items: WirePilgrimageSite[];
  sealed_count: number;
  nominatim_acknowledgement?: string;
}

function toSite(w: WirePilgrimageSite): PilgrimageSite {
  return {
    id: w.id,
    name: w.name,
    kind: (w.kind as PilgrimageSite["kind"]) ?? "other",
    x_norm: w.x_norm ?? 0.5,
    y_norm: w.y_norm ?? 0.5,
    recorded_precision: (w.recorded_precision as PilgrimageSite["recorded_precision"]) ?? "unmapped",
    sealed: w.sealed ?? false,
  };
}


export function PilgrimageMapRoute() {
  const [openSiteId, setOpenSiteId] = useState<string | null>(null);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);

  useTopbar(
    () => ({
      title: "Pilgrimage map",
      subtitle: "The places your practice has touched.",
    }),
    [],
  );

  const listQuery = useQuery({
    queryKey: ["pilgrimage-sites"],
    queryFn: async () =>
      (await apiMethods.listPilgrimageSites()) as unknown as WirePilgrimageListResponse,
    staleTime: 30_000,
  });

  const sites = useMemo<PilgrimageSite[]>(
    () => (listQuery.data?.items ?? []).map(toSite),
    [listQuery.data],
  );
  const sealedCount = listQuery.data?.sealed_count ?? 0;

  // Detail record for the currently-open site. For v1 we synthesise
  // the record from the list row; the full per-site fetch (GET
  // /pilgrimage-sites/{id}) lands with the SacredSite surface's
  // linked-workings + linked-media plumbing.
  const openRecord = useMemo<SacredSiteRecord | null>(() => {
    if (!openSiteId) return null;
    const site = listQuery.data?.items.find((s) => s.id === openSiteId);
    if (!site) return null;
    return {
      id: site.id,
      name: site.name,
      kind: (site.kind as SacredSiteRecord["kind"]) ?? "other",
      stored_precision: (site.recorded_precision as SacredSiteRecord["stored_precision"]) ?? "unmapped",
      coord_label: "—",
      story: "",
      linked_workings: [],
      linked_media: [],
    };
  }, [openSiteId, listQuery.data]);

  const handleSelectSite = useCallback((id: string) => {
    setOpenSiteId(id);
  }, []);

  const handleClose = useCallback(() => {
    setOpenSiteId(null);
  }, []);

  const handleRequantize = useCallback(
    (next: SiteRequantizeChoice) => {
      Toast.push({
        tone: "info",
        title: "Requantize",
        body: `POST /pilgrimage-sites/${openSiteId}/requantize (${next}) — endpoint wiring pending.`,
      });
    },
    [openSiteId],
  );

  const handleAddPlace = useCallback(() => {
    setAddPlaceOpen(true);
  }, []);

  const handleAddPlaceClose = useCallback(() => {
    setAddPlaceOpen(false);
  }, []);

  const handleAddPlaceSave = useCallback(
    (draft: AddPlaceDraft) => {
      Toast.push({
        tone: "info",
        title: `Saved "${draft.name}"`,
        body: `Add-place backend POST wires next; the draft is staged.`,
      });
      setAddPlaceOpen(false);
    },
    [],
  );

  return (
    <>
      <PilgrimageMapSurface
        sites={sites}
        sealed_count={sealedCount}
        onSelectSite={handleSelectSite}
        onAddPlace={handleAddPlace}
      />
      {openRecord ? (
        <SacredSiteSurface
          open={openSiteId !== null}
          record={openRecord}
          onClose={handleClose}
          onRequantize={handleRequantize}
        />
      ) : null}
      <AddPlaceModal
        open={addPlaceOpen}
        onClose={handleAddPlaceClose}
        onSave={handleAddPlaceSave}
      />
    </>
  );
}
