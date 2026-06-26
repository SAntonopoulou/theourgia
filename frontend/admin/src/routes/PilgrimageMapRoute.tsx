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
  Toast,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

export function PilgrimageMapRoute() {
  const navigate = useNavigate();

  useTopbar(
    () => ({
      title: "Pilgrimage map",
      subtitle: "The places your practice has touched.",
    }),
    [],
  );

  const handleSelectSite = useCallback(
    (id: string) => {
      navigate(`/pilgrimage/${id}`);
    },
    [navigate],
  );

  const handleAddPlace = useCallback(() => {
    Toast.push({
      tone: "info",
      title: "Add place",
      body: "Add Place modal ships next in Cluster C (surface 20).",
    });
  }, []);

  return (
    <PilgrimageMapSurface
      sites={FIXTURE_SITES}
      sealed_count={2}
      onSelectSite={handleSelectSite}
      onAddPlace={handleAddPlace}
    />
  );
}
