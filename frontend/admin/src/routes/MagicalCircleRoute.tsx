/**
 * Magical Circle — admin route. Persists circles via
 * POST /api/v1/circles. The surface emits its own UI-flavoured
 * enums; this route maps them to the backend wire enums.
 *
 * The surface intentionally has no fields for ``purpose``
 * or ``compass_points`` content — those are designer follow-ups.
 * For now the route supplies sensible defaults so the row is
 * persisted with a valid shape; the practitioner can refine via
 * the detail-view PATCH path once that surface lands.
 */

import {
  MagicalCircleSurface,
  Toast,
  type CentreElement,
  type CirclePreset,
  type CompassTraditionWire,
  type CompassTradition as MCCompassTradition,
  type RingKind,
  useTopbar,
} from "@theourgia/shared";
import { useCallback } from "react";

import { apiMethods } from "../data/api.js";

function mapRingKind(kind: RingKind): string {
  switch (kind) {
    case "glyphs":
      return "glyph_row";
    case "multi":
      return "multi_glyph";
    default:
      return kind;
  }
}

function mapCompass(c: MCCompassTradition): CompassTraditionWire {
  switch (c) {
    case "winds":
      return "greek_winds";
    case "dikpalas":
      return "vedic_dikpalas";
    default:
      return c;
  }
}

function mapCentre(c: CentreElement): string {
  switch (c) {
    case "solomonic":
      return "solomonic_seal";
    case "square":
      return "kamea_trace";
    default:
      return c;
  }
}

const DEFAULT_PURPOSE =
  "Working circle — purpose and compass-point content can be refined in the detail view.";

export function MagicalCircleRoute() {
  useTopbar(
    () => ({
      title: "Magical Circle",
      subtitle: "Concentric rings · compass points · centre element",
    }),
    [],
  );

  const handleSave = useCallback(
    async (payload: {
      name: string;
      rings: readonly RingKind[];
      compass: MCCompassTradition;
      centre: CentreElement;
      diameterMeters: number;
    }) => {
      try {
        const row = await apiMethods.createCircle({
          name: payload.name,
          purpose: DEFAULT_PURPOSE,
          diameter_m: payload.diameterMeters,
          rings: payload.rings.map((k) => ({ kind: mapRingKind(k) })),
          compass_tradition: mapCompass(payload.compass),
          compass_points: {},
          centre_element: { kind: mapCentre(payload.centre) },
        });
        Toast.push({
          tone: "success",
          title: "Circle saved",
          body: `“${row.name}” committed at ${payload.diameterMeters.toFixed(1)}m.`,
        });
      } catch (err) {
        Toast.push({
          tone: "error",
          title: "Could not save",
          body:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred.",
        });
      }
    },
    [],
  );

  const handleLoadPreset = useCallback((preset: CirclePreset) => {
    Toast.push({
      tone: "info",
      title: `Loaded preset · ${preset.name}`,
      body: "A mutable copy — no back-link to the source.",
    });
  }, []);

  return (
    <MagicalCircleSurface
      onSave={handleSave}
      onLoadPreset={handleLoadPreset}
    />
  );
}
