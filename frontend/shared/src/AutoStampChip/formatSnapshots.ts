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
    /** Pre-rendered date string, e.g. "20 Tammuz 5786 AM". */
    long?: string;
  };
  thelemic?: {
    year?: number;
    month?: number;
    day?: number;
    formatted?: string;
    long?: string;
  };
  /**
   * v1-016 — user-enabled extras (islamic, coptic, mayan,
   * french-republican, plugin calendars). Rendered exclusively from
   * the backend's pre-formatted `long` string — the b108-2hz rule:
   * the frontend keeps NO month-name tables for these, so it can
   * never disagree with the backend about what a month is called.
   */
  [calendarId: string]: unknown;
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

// Backend numbering (theourgia.core.calendars.hebrew.HEBREW_MONTH_NAMES)
// is Nisan-starting (Biblical / ecclesiastical order), NOT Tishri-starting:
// Nisan=1 · Iyyar=2 · Sivan=3 · Tammuz=4 · Av=5 · Elul=6 · Tishrei=7 ·
// Cheshvan=8 · Kislev=9 · Tevet=10 · Shevat=11 · Adar=12 · Adar II=13.
//
// Matching the backend exactly (b108-2hz): Sophia caught the mismatch —
// July → Tammuz should be month 4, and my Tishri-starting array was
// producing "Tevet" instead. The spelling "Iyyar" (double y) also
// mirrors the backend's canonical spelling.
const HEBREW_MONTH_NAMES = [
  "Nisan",
  "Iyyar",
  "Sivan",
  "Tammuz",
  "Av",
  "Elul",
  "Tishrei",
  "Cheshvan",
  "Kislev",
  "Tevet",
  "Shevat",
  "Adar",
  "Adar II",
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
    // Prefer the backend's pre-rendered "long" string, then compose
    // from day + month_name/month_number → name + year, else fall
    // through so the reader NEVER sees "month 4".
    if (typeof parsed.hebrew.long === "string" && parsed.hebrew.long) {
      parts.push(parsed.hebrew.long);
    } else {
      const month = hebrewMonthLabel(parsed.hebrew);
      if (
        month
        && typeof parsed.hebrew.day === "number"
        && typeof parsed.hebrew.year === "number"
      ) {
        parts.push(`${parsed.hebrew.day} ${month} ${parsed.hebrew.year}`);
      }
    }
  }
  if (parsed.thelemic?.formatted) {
    parts.push(parsed.thelemic.formatted);
  } else if (parsed.thelemic?.long) {
    parts.push(parsed.thelemic.long);
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
  // v1-016 — user-enabled extras (islamic, coptic, mayan,
  // french-republican, plugin calendars): always the backend's
  // pre-rendered `long`, never a frontend name table.
  const handledAbove = new Set(["gregorian", "julian", "hebrew", "thelemic", "instant_utc"]);
  for (const [calendarId, value] of Object.entries(parsed)) {
    if (handledAbove.has(calendarId)) continue;
    if (value === null || typeof value !== "object") continue;
    const long = (value as { long?: unknown }).long;
    if (typeof long === "string" && long) {
      parts.push(long);
    }
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
