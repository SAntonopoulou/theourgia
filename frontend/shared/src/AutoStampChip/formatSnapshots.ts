/**
 * Turn the backend auto-stamp JSON strings (b108-2hy) into the
 * short free-text labels the AutoStampChip expects.
 *
 * The backend stores compact JSON — sun.sign/glyph/degree,
 * moon.sign/phase/illumination_pct, gregorian/hebrew/thelemic dates.
 * The chip wants one-line prose. This helper is the bridge.
 *
 * Kept as pure functions so tests don't need to mount React.
 */

export interface AstroSnapshotShape {
  sun?: {
    sign?: string;
    glyph?: string;
    degree?: number;
  };
  moon?: {
    sign?: string;
    glyph?: string;
    degree?: number;
    phase?: string;
    illumination_pct?: number;
  };
  planets?: Record<string, { sign?: string; glyph?: string; degree?: number }>;
}

export interface CalendarSnapshotShape {
  gregorian?: { year?: number; month?: number; day?: number };
  julian?: { year?: number; month?: number; day?: number };
  hebrew?: {
    year?: number;
    month?: number;
    month_name?: string;
    day?: number;
  };
  thelemic?: {
    year?: number;
    month?: number;
    day?: number;
    formatted?: string;
  };
}

export function parseSnapshot<T>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as T)
      : null;
  } catch {
    return null;
  }
}

export function formatAstroSnapshot(
  raw: string | null | undefined,
): string | null {
  const parsed = parseSnapshot<AstroSnapshotShape>(raw);
  if (!parsed) return null;
  const parts: string[] = [];
  if (parsed.sun?.sign) {
    const glyph = parsed.sun.glyph ? ` ${parsed.sun.glyph}` : "";
    const degree =
      typeof parsed.sun.degree === "number"
        ? ` ${Math.floor(parsed.sun.degree)}°`
        : "";
    parts.push(`Sun${glyph} ${parsed.sun.sign}${degree}`);
  }
  if (parsed.moon?.sign) {
    const glyph = parsed.moon.glyph ? ` ${parsed.moon.glyph}` : "";
    const degree =
      typeof parsed.moon.degree === "number"
        ? ` ${Math.floor(parsed.moon.degree)}°`
        : "";
    parts.push(`Moon${glyph} ${parsed.moon.sign}${degree}`);
  }
  if (parsed.moon?.phase) {
    const pct =
      typeof parsed.moon.illumination_pct === "number"
        ? ` (${Math.round(parsed.moon.illumination_pct)}%)`
        : "";
    parts.push(`${parsed.moon.phase}${pct}`);
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

const HEBREW_MONTH_NAMES = [
  "Tishri",
  "Cheshvan",
  "Kislev",
  "Tevet",
  "Shevat",
  "Adar",
  "Adar II",
  "Nisan",
  "Iyar",
  "Sivan",
  "Tammuz",
  "Av",
  "Elul",
];

function hebrewMonthLabel(
  h: NonNullable<CalendarSnapshotShape["hebrew"]>,
): string | null {
  if (h.month_name) return h.month_name;
  if (typeof h.month === "number" && h.month >= 1 && h.month <= 13) {
    return HEBREW_MONTH_NAMES[h.month - 1] ?? null;
  }
  return null;
}

export function formatCalendarSnapshot(
  raw: string | null | undefined,
): string | null {
  const parsed = parseSnapshot<CalendarSnapshotShape>(raw);
  if (!parsed) return null;
  const parts: string[] = [];
  if (parsed.hebrew) {
    const month = hebrewMonthLabel(parsed.hebrew);
    if (
      month
      && typeof parsed.hebrew.day === "number"
      && typeof parsed.hebrew.year === "number"
    ) {
      parts.push(`${parsed.hebrew.day} ${month} ${parsed.hebrew.year}`);
    }
  }
  if (parsed.thelemic?.formatted) {
    parts.push(parsed.thelemic.formatted);
  }
  if (parsed.julian) {
    const j = parsed.julian;
    if (
      typeof j.year === "number"
      && typeof j.month === "number"
      && typeof j.day === "number"
    ) {
      parts.push(
        `Julian: ${j.year}-${String(j.month).padStart(2, "0")}-${String(j.day).padStart(2, "0")}`,
      );
    }
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
