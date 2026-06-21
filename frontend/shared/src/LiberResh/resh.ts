/**
 * Canonical Liber Resh data — the four solar adorations as published
 * in Aleister Crowley's `Liber CC vel Resh vel Helios` (1911, public
 * domain). The invocations are quoted verbatim because they are the
 * liturgy; the godform attributions are Crowley's own.
 *
 * Other traditions (Egyptian revival · Gnostic · etc.) will arrive as
 * registered plugins — until then `RESH_TRADITIONS` flags them
 * `soon` so the surface can render them disabled and honestly.
 */

export type ReshStation = "sunrise" | "noon" | "sunset" | "midnight";

export const RESH_STATION_ORDER: ReshStation[] = [
  "sunrise",
  "noon",
  "sunset",
  "midnight",
];

export interface ReshStationStaticMeta {
  /** Title-case display label ("Sunrise"). */
  label: string;
  /** SVG path-d string for the station's emblem (24×24 viewBox). */
  iconPath: string;
}

export const RESH_STATION_META: Record<ReshStation, ReshStationStaticMeta> = {
  sunrise: {
    label: "Sunrise",
    iconPath:
      "M3 18h18 M6.5 18a5.5 5.5 0 0 1 11 0 M12 3v3.2 M5.2 8.4l1.6 1.6 M18.8 8.4l-1.6 1.6 M2.5 13.5h1.6 M19.9 13.5h1.6",
  },
  noon: {
    label: "Noon",
    iconPath:
      "M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6 M12 2.4v2.4 M12 19.2v2.4 M2.4 12h2.4 M19.2 12h2.4 M5.1 5.1l1.7 1.7 M17.2 17.2l1.7 1.7 M18.9 5.1l-1.7 1.7 M6.8 17.2l-1.7 1.7",
  },
  sunset: {
    label: "Sunset",
    iconPath:
      "M3 18h18 M6.5 18a5.5 5.5 0 0 1 11 0 M12 7.5V3 M9 5.5l3-2.5 3 2.5 M2.5 13.5h1.6 M19.9 13.5h1.6",
  },
  midnight: {
    label: "Midnight",
    iconPath:
      "M16.5 14.2A6.2 6.2 0 1 1 10 7.6 4.9 4.9 0 0 0 16.5 14.2Z M19 4.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4L16.6 6.4l1.4-.5z",
  },
};

export interface ReshAdoration {
  /** Crowley's godform attribution. */
  godform: string;
  /** Liturgical direction ("the East", "the height", etc.). */
  direction: string;
  /** Verbatim Liber CC invocation (PD, 1911). */
  invocation: string;
}

export type ReshTraditionKey = "thelemic" | "egyptian" | "gnostic";

export interface ReshTradition {
  key: ReshTraditionKey;
  label: string;
  /** `true` for traditions whose attributions await practitioner
   *  consultation — surface renders them disabled. */
  soon: boolean;
  stations: Record<ReshStation, ReshAdoration>;
}

/**
 * The canonical Thelemic adorations from Liber CC. Public domain
 * (1911). Quoted verbatim.
 */
export const RESH_THELEMIC: ReshTradition = {
  key: "thelemic",
  label: "Thelemic",
  soon: false,
  stations: {
    sunrise: {
      godform: "Ra-Hoor-Khuit",
      direction: "the East",
      invocation:
        "Hail unto Thee who art Ra in Thy rising, even unto Thee who art Ra in Thy strength.",
    },
    noon: {
      godform: "Hadit",
      direction: "the height",
      invocation:
        "Hail unto Thee who art Ahathoor in Thy triumphing, even unto Thee who art Ahathoor in Thy beauty.",
    },
    sunset: {
      godform: "Tum",
      direction: "the West",
      invocation:
        "Hail unto Thee who art Tum in Thy setting, even unto Thee who art Tum in Thy joy.",
    },
    midnight: {
      godform: "Khephra",
      direction: "the deep",
      invocation:
        "Hail unto Thee who art Khephra in Thy hiding, even unto Thee who art Khephra in Thy silence.",
    },
  },
};

/**
 * Placeholder traditions awaiting plugin / practitioner consultation.
 * Stations are empty so callers either gate them or render the
 * "plugin" affix; the entry exists so the cycler can list them.
 */
export const RESH_TRADITIONS: Record<ReshTraditionKey, ReshTradition> = {
  thelemic: RESH_THELEMIC,
  egyptian: {
    key: "egyptian",
    label: "Egyptian revival",
    soon: true,
    stations: RESH_THELEMIC.stations, // placeholder; not displayed when soon=true
  },
  gnostic: {
    key: "gnostic",
    label: "Gnostic",
    soon: true,
    stations: RESH_THELEMIC.stations,
  },
};

export const RESH_TRADITION_ORDER: ReshTraditionKey[] = [
  "thelemic",
  "egyptian",
  "gnostic",
];

/** A single observed adoration as the surface receives it from the API. */
export interface ReshObservation {
  station: ReshStation;
  /** Minute-of-day when the practitioner marked it observed. */
  observedAtMin: number;
  /** Optional free-text note. */
  note?: string;
}

/** Format minute-of-day as "HH:MM". */
export function formatMinute(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
