/**
 * Tiptap node — calendarStamp.
 *
 * A snapshot of a moment across several calendar systems. Stored as an
 * ISO instant + user-picked calendars; renders each formatted line
 * client-side so the label can update if calendar plugins gain new
 * variants.
 *
 * Persisted attrs:
 *   - at:        ISO-8601 instant (default: node insertion time)
 *   - note:      free-form label (e.g. "banishing before dawn")
 *   - calendars: subset of built-in calendars to display
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";

const LINE = "var(--line)";

export type CalendarKey =
  | "gregorian"
  | "julian"
  | "hebrew"
  | "hijri"
  | "coptic"
  | "thelemic";

const CAL_LABEL: Record<CalendarKey, string> = {
  gregorian: "Gregorian",
  julian: "Julian",
  hebrew: "Hebrew",
  hijri: "Hijri",
  coptic: "Coptic",
  thelemic: "Thelemic",
};

const CAL_ORDER: CalendarKey[] = [
  "gregorian",
  "julian",
  "hebrew",
  "hijri",
  "coptic",
  "thelemic",
];

/** Julian day number for a Gregorian date. */
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

/** Round-trip JDN back to a Julian-calendar Y/M/D. */
function jdnToJulian(j: number): { y: number; m: number; d: number } {
  const b = j + 32082;
  const c = Math.floor((4 * b + 3) / 1461);
  const d = b - Math.floor((1461 * c) / 4);
  const e = Math.floor((5 * d + 2) / 153);
  const day = d - Math.floor((153 * e + 2) / 5) + 1;
  const month = e + 3 - 12 * Math.floor(e / 10);
  const year = c - 4800 + Math.floor(e / 10);
  return { y: year, m: month, d: day };
}

/** Hebrew year/month/day from JDN (Reingold/Dershowitz simplified). */
function jdnToHebrew(j: number): { y: number; m: number; d: number } {
  // Rough approximation using the Rata Die epoch. Sufficient as a
  // display readout in the editor; the definitive computation lives in
  // the backend calendar engine.
  const rd = j - 1721425;
  const y = Math.floor((rd + 1373429) / 366);
  let year = y;
  while (rd >= hebrewNewYearRd(year + 1)) year++;
  const ny = hebrewNewYearRd(year);
  const dayOfYear = rd - ny + 1;
  return { y: year, m: 1, d: dayOfYear };
}

function hebrewNewYearRd(y: number): number {
  const months = Math.floor((235 * y - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);
  if ((3 * (day + 1)) % 7 < 3) day++;
  return day - 1373429;
}

interface CalRow {
  key: CalendarKey;
  label: string;
  value: string;
}

function formatFor(at: Date, key: CalendarKey): string {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth() + 1;
  const d = at.getUTCDate();
  const j = jdn(y, m, d);
  switch (key) {
    case "gregorian":
      return at.toISOString().slice(0, 10);
    case "julian": {
      const jd = jdnToJulian(j);
      return `${jd.y}-${String(jd.m).padStart(2, "0")}-${String(jd.d).padStart(2, "0")} (O.S.)`;
    }
    case "hebrew": {
      const h = jdnToHebrew(j);
      return `${h.y} AM · day ${h.d}`;
    }
    case "hijri": {
      const days = j - 1948440;
      const year = Math.floor((30 * days + 10646) / 10631);
      const dayOfYear = days - Math.floor((10631 * year - 10646) / 30);
      return `${year} AH · day ${Math.max(1, dayOfYear)}`;
    }
    case "coptic": {
      const days = j - 1825030;
      const year = Math.floor(days / 365.25);
      return `${Math.max(1, year)} A.M. Coptic`;
    }
    case "thelemic": {
      const equinoxYear = (m > 3 || (m === 3 && d >= 20) ? y : y - 1) - 1904;
      const doc = Math.floor(equinoxYear / 22);
      const anno = equinoxYear - doc * 22;
      const roman = (n: number) => {
        const map: [number, string][] = [
          [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
        ];
        let out = "";
        for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
        return out;
      };
      return `Anno ${roman(anno)}${doc > 0 ? ` · docennium ${doc}` : ""}`;
    }
  }
}

function CalendarStampView({ node, updateAttributes, editor }: NodeViewProps) {
  const at: string = node.attrs.at ?? new Date().toISOString();
  const note: string = node.attrs.note ?? "";
  const calendars: CalendarKey[] = Array.isArray(node.attrs.calendars)
    ? (node.attrs.calendars as CalendarKey[])
    : ["gregorian", "hebrew", "thelemic"];
  const editable = editor.isEditable;

  const date = new Date(at);
  const rows: CalRow[] = calendars.map((k) => ({
    key: k,
    label: CAL_LABEL[k],
    value: formatFor(date, k),
  }));

  function toggleCal(k: CalendarKey) {
    const next = calendars.includes(k)
      ? calendars.filter((x) => x !== k)
      : [...calendars, k];
    updateAttributes({ calendars: CAL_ORDER.filter((x) => next.includes(x)) });
  }

  return (
    <NodeViewWrapper
      data-block="calendar-stamp"
      style={{
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        overflow: "hidden",
        margin: "0 0 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: `1px solid ${LINE}`,
          background: "var(--bg-3)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--c-synchronicity)"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <path d="M4 10h16M9 4v4M15 4v4" strokeLinecap="round" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Calendar stamp
        </span>
        {editable && (
          <input
            type="datetime-local"
            value={at.slice(0, 16)}
            onChange={(e) =>
              updateAttributes({
                at: new Date(e.target.value).toISOString(),
              })
            }
            aria-label="Timestamp"
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              background: "var(--bg-2)",
              color: "var(--ink-soft)",
              border: `1px solid ${LINE}`,
              borderRadius: "var(--r-sm)",
              padding: "2px 6px",
            }}
          />
        )}
      </div>
      <div style={{ padding: 16 }}>
        {editable ? (
          <input
            type="text"
            value={note}
            onChange={(e) => updateAttributes({ note: e.target.value })}
            placeholder="Label (optional — e.g. 'banishing before dawn')"
            aria-label="Timestamp note"
            style={{
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--ink)",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              padding: 0,
              width: "100%",
              marginBottom: 12,
            }}
          />
        ) : note ? (
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink)",
              margin: "0 0 12px",
            }}
          >
            {note}
          </p>
        ) : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: 6,
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}
        >
          {rows.map((r) => (
            <div key={r.key} style={{ display: "contents" }}>
              <span style={{ color: "var(--ink-mute)" }}>{r.label}</span>
              <span style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
        {editable && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {CAL_ORDER.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => toggleCal(k)}
                aria-pressed={calendars.includes(k)}
                style={{
                  padding: "3px 9px",
                  border: `1px solid ${LINE}`,
                  borderRadius: "var(--r-sm)",
                  background: calendars.includes(k) ? "var(--accent-soft)" : "var(--bg)",
                  color: calendars.includes(k) ? "var(--ink)" : "var(--ink-mute)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {CAL_LABEL[k]}
              </button>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const CalendarStampNode = Node.create({
  name: "calendarStamp",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      at: { default: null },
      note: { default: "" },
      calendars: {
        default: ["gregorian", "hebrew", "thelemic"],
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute("data-calendars");
          if (!raw) return ["gregorian", "hebrew", "thelemic"];
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : ["gregorian"];
          } catch {
            return ["gregorian"];
          }
        },
        renderHTML: (attrs: { calendars: CalendarKey[] }) => ({
          "data-calendars": JSON.stringify(attrs.calendars ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-block='calendar-stamp']" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block": "calendar-stamp" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalendarStampView);
  },
});
