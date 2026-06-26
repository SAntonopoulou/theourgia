/**
 * Pilgrimage Map — admin route wrapping the shared
 * PilgrimageMapSurface (H07 §S3 surface 18).
 *
 * Stylised stand-in per H07 §S6.3. Real Leaflet wiring lands later
 * (and stays optional even then — the offline SVG is a valid
 * end-state for users who never opt into the OSM tile fetch).
 */

import {
  type PilgrimageSite,
  PilgrimageMapSurface,
  type SacredSiteRecord,
  SacredSiteSurface,
  type SiteRequantizeChoice,
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback, useMemo, useState } from "react";

const FIXTURE_SITES: PilgrimageSite[] = [
  {
    id: "crossroads",
    name: "The crossroads stone",
    kind: "working",
    x_norm: 0.34,
    y_norm: 0.77,
    recorded_precision: "1km",
    sealed: false,
  },
  {
    id: "eleusis",
    name: "Eleusis",
    kind: "sacred",
    x_norm: 0.3,
    y_norm: 0.32,
    recorded_precision: "exact",
    sealed: false,
  },
  {
    id: "tainaron",
    name: "Cape Tainaron",
    kind: "pilgrimage",
    x_norm: 0.47,
    y_norm: 0.48,
    recorded_precision: "1km",
    sealed: false,
  },
  {
    id: "village",
    name: "Grandmother's village",
    kind: "ancestral",
    x_norm: 0.74,
    y_norm: 0.58,
    recorded_precision: "country",
    sealed: false,
  },
  {
    id: "library",
    name: "The old library",
    kind: "other",
    x_norm: 0.56,
    y_norm: 0.37,
    recorded_precision: "10km",
    sealed: false,
  },
];

const FIXTURE_SITE_DETAILS: Record<string, SacredSiteRecord> = {
  tainaron: {
    id: "tainaron",
    name: "Cape Tainaron",
    kind: "pilgrimage",
    stored_precision: "1km",
    coord_label: "36.39° N, 22.48° E",
    story:
      "The southernmost point of the Mani — the ancients held it for one of the mouths of the underworld, where Herakles dragged Cerberus up into the light. I made the descent to the sea-cave at dawn and left the offering at the waterline.",
    linked_workings: [
      { id: "w1", title: "Descent at Tainaron", date_label: "21 Sep 2025" },
      {
        id: "w2",
        title: "Offering at the waterline",
        date_label: "21 Sep 2025",
      },
    ],
    linked_media: [{ id: "m1" }, { id: "m2" }, { id: "m3" }],
  },
  eleusis: {
    id: "eleusis",
    name: "Eleusis",
    kind: "sacred",
    stored_precision: "exact",
    coord_label: "38.04° N, 23.55° E",
    story:
      "The Telesterion of the Mysteries. Even in ruin the ground holds something that remembers.",
    linked_workings: [],
    linked_media: [],
  },
  crossroads: {
    id: "crossroads",
    name: "The crossroads stone",
    kind: "working",
    stored_precision: "1km",
    coord_label: "37.97° N, 23.72° E",
    story: "A three-way stone outside the city, used at the dark moon.",
    linked_workings: [],
    linked_media: [],
  },
  village: {
    id: "village",
    name: "Grandmother's village",
    kind: "ancestral",
    stored_precision: "country",
    coord_label: "Greece",
    story: "Where she was born, where the line begins for me.",
    linked_workings: [],
    linked_media: [],
  },
  library: {
    id: "library",
    name: "The old library",
    kind: "other",
    stored_precision: "10km",
    coord_label: "Somewhere in the city",
    story: "Where I first read the Chaldean Oracles.",
    linked_workings: [],
    linked_media: [],
  },
};

export function PilgrimageMapRoute() {
  const [openSiteId, setOpenSiteId] = useState<string | null>(null);
  const [siteDetails, setSiteDetails] = useState(FIXTURE_SITE_DETAILS);

  useTopbar(
    () => ({
      title: "Pilgrimage map",
      subtitle: "The places your practice has touched.",
    }),
    [],
  );

  const openRecord = useMemo(
    () => (openSiteId ? siteDetails[openSiteId] : null),
    [openSiteId, siteDetails],
  );

  const handleSelectSite = useCallback((id: string) => {
    setOpenSiteId(id);
  }, []);

  const handleClose = useCallback(() => {
    setOpenSiteId(null);
  }, []);

  const handleRequantize = useCallback(
    (next: SiteRequantizeChoice) => {
      if (!openSiteId) return;
      setSiteDetails((d) => {
        const cur = d[openSiteId];
        if (!cur) return d;
        return {
          ...d,
          [openSiteId]: {
            ...cur,
            stored_precision:
              next === "unmapped" ? "unmapped" : next,
          },
        };
      });
      Toast.push({
        tone: "info",
        title: "Precision lowered",
        body: "The precise coordinates have been discarded.",
      });
    },
    [openSiteId],
  );

  const handleAddPlace = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Add place",
      body: "Add Place modal ships next in Cluster C (surface 20).",
    });
  }, []);

  return (
    <>
      <PilgrimageMapSurface
        sites={FIXTURE_SITES}
        sealed_count={2}
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
    </>
  );
}
