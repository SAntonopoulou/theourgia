/**
 * Read a `festival-calendar` pack into its occasions — for the web reference.
 *
 * The phone keeps the calendar live: it knows what today is against the sky and
 * marks the day. The web has no clock of the practitioner's sky, so it shows the
 * calendar as reference — which days a tradition keeps, when in the lunar or
 * solar cycle each falls, and what it is for.
 *
 * The payload is the phone's calendar reshaped to MBF: `occasions:*` items (the
 * festival days), a `reckonings:*` item (how the months are counted), and
 * `options:*` items (configuration), which are not shown.
 */

export interface Occasion {
  key: string;
  name: string;
  summary: string;
  note?: string;
  /** The body the day belongs to — `moon`, `sun`. */
  significator?: string;
  /** A human phrase for when it falls, derived from the anchor. */
  when?: string;
  tags: string[];
}

export interface Reckoning {
  key: string;
  name: string;
  detail?: string;
  /** The month-names of this reckoning, in order. */
  monthNames: string[];
}

export interface FestivalCalendar {
  occasions: Occasion[];
  reckonings: Reckoning[];
}

const LUNAR: Record<number, string> = {
  0: "the dark moon",
  90: "the first quarter",
  180: "the full moon",
  270: "the last quarter",
};

const SOLAR: Record<number, string> = {
  0: "the spring equinox",
  90: "the summer solstice",
  180: "the autumn equinox",
  270: "the winter solstice",
};

function describeWhen(anchor: unknown, at: unknown): string | undefined {
  const parts: string[] = [];
  if (anchor !== null && typeof anchor === "object") {
    const a = anchor as Record<string, unknown>;
    const kind = typeof a.kind === "string" ? a.kind : null;
    const degrees = typeof a.degrees === "number" ? a.degrees : null;
    if (kind === "lunar" && degrees !== null) {
      parts.push(LUNAR[degrees] ?? `the Moon at ${degrees}°`);
    } else if (kind === "solar" && degrees !== null) {
      parts.push(SOLAR[degrees] ?? `the Sun at ${degrees}°`);
    }
  }
  if (at !== null && typeof at === "object") {
    const time = (at as Record<string, unknown>).solar;
    if (typeof time === "string") parts.push(`at ${time}`);
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function packToFestivalCalendar(payload: unknown): FestivalCalendar {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return { occasions: [], reckonings: [] };

  const occasions: Occasion[] = [];
  const reckonings: Reckoning[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const ref = typeof item.ref === "string" ? item.ref : "";

    if (ref.startsWith("occasions:")) {
      const key = typeof item.key === "string" ? item.key : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (key === null || name === null) continue;
      occasions.push({
        key,
        name,
        summary: typeof item.summary === "string" ? item.summary : "",
        note: typeof item.note === "string" ? item.note : undefined,
        significator: typeof item.significator === "string" ? item.significator : undefined,
        when: describeWhen(item.anchor, item.at),
        tags: strings(item.tags),
      });
    } else if (ref.startsWith("reckonings:")) {
      const key = typeof item.key === "string" ? item.key : null;
      const name = typeof item.name === "string" ? item.name : null;
      if (key === null || name === null) continue;
      const months = item.months;
      const monthNames =
        months !== null && typeof months === "object"
          ? strings((months as Record<string, unknown>).names)
          : [];
      reckonings.push({
        key,
        name,
        detail: typeof item.detail === "string" ? item.detail : undefined,
        monthNames,
      });
    }
  }
  return { occasions, reckonings };
}
