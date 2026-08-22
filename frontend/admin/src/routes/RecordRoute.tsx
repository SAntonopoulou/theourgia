/**
 * The record — the phone's ledger of practice, synced here and read whole.
 *
 * Sophia's ruling, held to the letter: the record is NOT the journal. The
 * journal is entries with a type and a visibility; this is a timed ledger
 * of what was done — keepings with a Mood and a Body reading, notes in
 * whatever tongue the rite demanded, each carrying the sky it happened
 * under. It arrives by sync from a linked device and rests in
 * `record_entry` as whole documents; this page reads them — and mends or
 * removes them THROUGH THE PROTOCOL: every write goes out as the same
 * whole-document PUT the devices push with, last writer wins on the
 * timestamp, and the phone applies it at its next sync as news like any
 * other. The server stays a shelf, never an author.
 *
 * Days first, newest first, then a day's entries in the order they were
 * kept — the phone's own three levels, minus one until entries grow a
 * detail view worth opening.
 *
 * Mounted at /record.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

import { apiGet, apiPut } from "../lib/api.js";

type WireEntry = {
  id: string;
  kind: string;
  doc: {
    subjectKey?: string;
    observedAt?: string;
    occurrenceAt?: string;
    at?: string;
    note?: string;
    body?: string;
    mood?: number | null;
    bodyFeeling?: number | null;
    durationSeconds?: number | null;
    sleepQuality?: number | null;
    /** Subject kinds carry the whole device row here. */
    row?: Record<string, unknown>;
    context?: {
      capturedAt?: string;
      moonSignIndex?: number | null;
      moonDegreeInSign?: number | null;
      sunSignIndex?: number | null;
      planetaryHourRuler?: string | null;
      dayRuler?: string | null;
      sect?: string | null;
      moonVoidOfCourse?: boolean | null;
      skyFailureReason?: string | null;
      locationLabel?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  };
  updated_at_utc: string;
  deleted_at_utc: string | null;
  seq: number;
};

/** The kinds that are events of the record; everything else on the shelf
 * is a definition — a rite, a sitting, an arrangement, a working and its
 * parts — read for its NAME and never shown as a day's entry. Reckonings,
 * reflections and elections are events: each is a thing done at a time. */
const EVENT_KINDS = new Set(["observance", "day-entry", "reckoning", "reflection", "election"]);

/** When an event happened, wherever its kind keeps that.
 *
 * The hand-mapped kinds say it at the top of their doc; the whole-row
 * kinds carry it inside the row the device serialized — keptAt for a
 * reckoning, writtenAt for a reflection, createdAt for an election. */
export function atOf(entry: WireEntry): string {
  const row = entry.doc.row ?? {};
  const fromRow = (key: string): string | undefined => {
    const value = row[key];
    return typeof value === "string" ? value : undefined;
  };
  return (
    entry.doc.observedAt ??
    entry.doc.at ??
    fromRow("keptAt") ??
    fromRow("writtenAt") ??
    fromRow("createdAt") ??
    entry.updated_at_utc
  );
}

/** Names, gathered from the synced subject rows.
 *
 * An arrangement resolves through to its subject where it has no title of
 * its own — a keeping through "schedule:x" was a keeping of the rite the
 * arrangement stands for, and the record names the practice, not the
 * paperwork. The phone's own reader keeps the same rule. */
export function namesFrom(entries: WireEntry[]): Map<string, string> {
  const names = new Map<string, string>();
  const deferred: WireEntry[] = [];
  for (const entry of entries) {
    const row = entry.doc.row;
    if (!row) continue;
    if (entry.kind === "ritual" || entry.kind === "meditation" || entry.kind === "working") {
      const name = row.name;
      if (typeof name === "string" && name.length > 0) {
        names.set(`${entry.kind}:${entry.id}`, name);
      }
    } else if (entry.kind === "schedule" || entry.kind === "working-item") {
      // Resolves through to something named above; second pass.
      deferred.push(entry);
    }
  }
  for (const entry of deferred) {
    const row = entry.doc.row ?? {};
    const title = typeof row.title === "string" ? row.title : "";
    const subject =
      entry.kind === "schedule"
        ? `${String(row.subjectKind ?? "")}:${String(row.subjectId ?? "")}`
        : // A working's item is named by its own title, else the rite it
          // performs, else the working it serves — the phone's own order.
          row.ritualId
          ? `ritual:${String(row.ritualId)}`
          : `working:${String(row.workingId ?? "")}`;
    const resolved = title || names.get(subject);
    if (resolved) names.set(`${entry.kind}:${entry.id}`, resolved);
  }
  return names;
}

type PullResult = {
  entries: WireEntry[];
  next_since: number;
  more: boolean;
};

/** What to call a keeping, from the shape of its subject key.
 *
 * Honest placeholders: the wire carries keys, not display names, until the
 * rest of the record joins the sync. A station's key is its own name; the
 * rest say what kind of thing was kept rather than pretending to know
 * which. */
export function titleOf(subjectKey: string | undefined, names?: Map<string, string>): string {
  if (!subjectKey) return "A keeping";
  const named = names?.get(subjectKey.split("#")[0] ?? subjectKey);
  if (named) return named;
  const station: Record<string, string> = {
    moonrise: "Moonrise",
    "upper-culmination": "Upper culmination",
    moonset: "Moonset",
    "lower-culmination": "Lower culmination",
    sunrise: "Sunrise",
    "solar-noon": "Solar noon",
    sunset: "Sunset",
    "solar-midnight": "Solar midnight",
  };
  const stationName = station[subjectKey];
  if (stationName) return stationName;
  if (subjectKey.startsWith("ritual:")) return "A rite";
  if (subjectKey.startsWith("meditation:")) return "A sitting";
  if (subjectKey.startsWith("schedule:")) return "A scheduled keeping";
  if (subjectKey.startsWith("working-item:")) return "A working's day";
  if (subjectKey.startsWith("day-entry:")) return "A day's entry";
  return "A keeping";
}

/** The events that carry their whole device row: what to call them and
 * what of theirs to quote. Null for every other kind. */
export function rowEvent(entry: WireEntry): { title: string; quote: string } | null {
  const row = entry.doc.row ?? {};
  const str = (key: string): string => {
    const value = row[key];
    return typeof value === "string" ? value : "";
  };
  if (entry.kind === "reckoning") {
    const total = typeof row.total === "number" ? ` = ${row.total}` : "";
    const note = str("note");
    return {
      title: "A reckoning",
      quote: `${str("wrote")}${total}${note ? ` — ${note}` : ""}`,
    };
  }
  if (entry.kind === "reflection") {
    return {
      title: str("kind") === "intention" ? "An intention" : "A reflection",
      quote: str("body"),
    };
  }
  if (entry.kind === "election") {
    const matter = str("matterName");
    return {
      title: matter ? `An election — ${matter}` : "An election",
      quote: str("note"),
    };
  }
  return null;
}

/** The whole of one entry, as label–value lines for its opened detail.
 *
 * Pure, so the claim "everything the capture holds is readable here" is a
 * test rather than a hope. Empty values are dropped, not shown blank. */
export function detailsOf(entry: WireEntry): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const doc = entry.doc;
  const row = doc.row ?? {};
  const str = (key: string): string => {
    const value = row[key];
    return typeof value === "string" ? value : "";
  };
  const when = (iso: string | undefined | null): string =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  if (entry.kind === "observance") {
    if (doc.occurrenceAt && doc.occurrenceAt !== doc.observedAt) {
      out.push(["The moment itself", when(doc.occurrenceAt)]);
      out.push(["Kept at", when(doc.observedAt)]);
    }
    if (doc.durationSeconds != null) {
      const minutes = Math.floor(doc.durationSeconds / 60);
      out.push(["Lasted", `${minutes} min ${doc.durationSeconds % 60} s`]);
    }
    const sky = doc.context;
    if (sky) {
      if (sky.moonSignIndex != null) {
        const degree = sky.moonDegreeInSign != null ? ` ${sky.moonDegreeInSign.toFixed(1)}°` : "";
        out.push(["Moon", `${SIGNS[sky.moonSignIndex] ?? ""}${degree}`]);
      }
      if (sky.sunSignIndex != null) {
        out.push(["Sun", SIGNS[sky.sunSignIndex] ?? ""]);
      }
      if (sky.planetaryHourRuler) {
        out.push(["Hour of", sky.planetaryHourRuler]);
      }
      if (sky.dayRuler) out.push(["Day of", sky.dayRuler]);
      if (sky.sect) out.push(["Sect", sky.sect]);
      if (sky.moonVoidOfCourse) out.push(["Moon", "void of course"]);
      if (sky.skyFailureReason) {
        out.push(["No sky", `not captured (${sky.skyFailureReason})`]);
      }
      const place =
        sky.locationLabel ||
        (sky.latitude != null && sky.longitude != null
          ? `${sky.latitude.toFixed(2)}, ${sky.longitude.toFixed(2)}`
          : "");
      if (place) out.push(["Where", place]);
    }
  }
  if (entry.kind === "day-entry" && doc.sleepQuality != null) {
    out.push(["Sleep", String(doc.sleepQuality)]);
  }
  if (entry.kind === "reckoning") {
    out.push(["Counted under", `${str("letterTable")} / ${str("normalising")}`]);
    out.push(["System", `${str("systemId")} · ${str("methodId")}`]);
    if (str("unread")) {
      out.push(["⚠ Unread", `${str("unread")} — the total is about less than was typed`]);
    }
  }
  if (entry.kind === "reflection") {
    const revisit = str("revisitAt");
    if (revisit) out.push(["Revisit", when(revisit)]);
    if (str("subjectKey")) out.push(["About", str("subjectKey")]);
  }
  if (entry.kind === "election") {
    if (str("spanFrom") && str("spanUntil")) {
      out.push(["Asked over", `${when(str("spanFrom"))} — ${when(str("spanUntil"))}`]);
    }
    if (typeof row.strictness === "number") {
      out.push(["Strictness", row.strictness.toFixed(2)]);
    }
    if (str("significator")) out.push(["Significator", str("significator")]);
    const place =
      str("locationLabel") ||
      (typeof row.latitude === "number" && typeof row.longitude === "number"
        ? `${row.latitude.toFixed(2)}, ${row.longitude.toFixed(2)}`
        : "");
    if (place) out.push(["Where", place]);
    if (str("subjectName")) out.push(["For", str("subjectName")]);
  }
  return out;
}

/** The day's own entries, in the phone's words. */
const DAY_ENTRY_KINDS: Record<string, string> = {
  dream: "A dream",
  dreamIntention: "A dream intention",
  waking: "Waking",
  sleeping: "Sleeping",
  note: "A note",
  sky: "The sky, seen",
};

const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/** Five points, spoken as the phone speaks them. */
const MOODS = ["", "Grim", "Low", "Level", "Glad", "Radiant"];
const BODIES = ["", "Spent", "Weary", "Steady", "Rested", "Vital"];

// ── the span, stepped as the phone steps it ────────────────────────────

export type RecordSpan = "week" | "month" | "year";

const SPAN_LABELS: Record<RecordSpan, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
};

/** The span's start containing `at` — the week from Monday, because the
 *  week a practitioner names is the week they live in. */
export function startOfSpan(at: Date, span: RecordSpan): Date {
  const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  if (span === "week") {
    const weekday = (day.getDay() + 6) % 7; // Monday 0
    day.setDate(day.getDate() - weekday);
    return day;
  }
  if (span === "month") return new Date(at.getFullYear(), at.getMonth(), 1);
  return new Date(at.getFullYear(), 0, 1);
}

export function endOfSpan(from: Date, span: RecordSpan): Date {
  if (span === "week") {
    const until = new Date(from);
    until.setDate(until.getDate() + 7);
    return until;
  }
  if (span === "month") return new Date(from.getFullYear(), from.getMonth() + 1, from.getDate());
  return new Date(from.getFullYear() + 1, from.getMonth(), from.getDate());
}

export function stepSpan(from: Date, span: RecordSpan, direction: 1 | -1): Date {
  if (span === "week") {
    const at = new Date(from);
    at.setDate(at.getDate() + 7 * direction);
    return at;
  }
  if (span === "month") return new Date(from.getFullYear(), from.getMonth() + direction, 1);
  return new Date(from.getFullYear() + direction, 0, 1);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function spanLabel(from: Date, span: RecordSpan): string {
  if (span === "week") {
    const last = endOfSpan(from, span);
    last.setDate(last.getDate() - 1);
    return `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]} – ${last.getDate()} ${MONTHS_SHORT[last.getMonth()]}`;
  }
  if (span === "month") return `${from.toLocaleDateString(undefined, { month: "long" })} ${from.getFullYear()}`;
  return String(from.getFullYear());
}

// ── what to look for ───────────────────────────────────────────────────

/** The kinds an entry may be, in the record's own words. */
const KIND_CHOICES: { kind: string; label: string }[] = [
  { kind: "observance", label: "Keepings" },
  { kind: "day-entry", label: "The day's entries" },
  { kind: "reckoning", label: "Reckonings" },
  { kind: "reflection", label: "Reflections" },
  { kind: "election", label: "Elections" },
];

/** A sky condition an entry was kept under, encoded for the chip set. */
export function skyClausesOf(entry: WireEntry): string[] {
  const sky = entry.doc.context;
  if (!sky) return [];
  const out: string[] = [];
  if (sky.moonSignIndex != null) out.push(`moon:${sky.moonSignIndex}`);
  if (sky.planetaryHourRuler) out.push(`hour:${sky.planetaryHourRuler}`);
  if (sky.sect) out.push(`sect:${sky.sect}`);
  if (sky.moonVoidOfCourse) out.push("void");
  return out;
}

export function skyClauseLabel(clause: string): string {
  const [kind, value] = clause.split(":");
  if (kind === "moon") return `Moon in ${SIGNS[Number(value)] ?? "?"}`;
  if (kind === "hour")
    return `hour of ${(value ?? "").charAt(0).toUpperCase()}${(value ?? "").slice(1)}`;
  if (kind === "sect") return `${(value ?? "").charAt(0).toUpperCase()}${(value ?? "").slice(1)}`;
  return "Moon void of course";
}

/** Free text against the words an entry carries or is named by. */
export function matchesWords(entry: WireEntry, words: string, names: Map<string, string>): boolean {
  const needle = words.trim().toLowerCase();
  if (!needle) return true;
  const carried = rowEvent(entry);
  const haystack = [
    carried?.title ?? "",
    carried?.quote ?? "",
    String(entry.doc.note ?? ""),
    String(entry.doc.body ?? ""),
    titleOf(entry.doc.subjectKey, names),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function RecordRoute() {
  useTopbar(
    () => ({
      title: "The record",
      subtitle: "What was done, as the devices keep it",
    }),
    [],
  );

  const [entries, setEntries] = useState<WireEntry[] | null>(null);
  // Month, because a practice kept daily is read a month at a time — long
  // enough to see a shape, short enough to hold in the head.
  const [span, setSpan] = useState<RecordSpan>("month");
  const [from, setFrom] = useState<Date>(() => startOfSpan(new Date(), "month"));
  const [filterOpen, setFilterOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<Set<string>>(new Set());
  const [skyFilter, setSkyFilter] = useState<Set<string>>(new Set());
  const [words, setWords] = useState("");
  const [frame, setFrame] = useState<"civil" | "sunrise" | "moonrise">("civil");
  const [frameBounds, setFrameBounds] = useState<string[] | null>(null);
  const [frameNote, setFrameNote] = useState("");

  /** Write one changed entry back through the shelf's own conflict rules —
   * the same PUT the devices use, last writer wins on the timestamp. The
   * phone pulls it on its next sync and applies it as news like any other. */
  const writeBack = async (changed: WireEntry) => {
    await apiPut("/record/entries", {
      entries: [
        {
          id: changed.id,
          kind: changed.kind,
          doc: changed.doc,
          updated_at_utc: changed.updated_at_utc,
          deleted_at_utc: changed.deleted_at_utc,
        },
      ],
    });
    setEntries((held) => held?.map((one) => (one.id === changed.id ? changed : one)) ?? held);
  };

  const remove = async (entry: WireEntry) => {
    if (!window.confirm("Remove this from the record? The device learns of it at its next sync.")) {
      return;
    }
    const now = new Date().toISOString();
    await writeBack({ ...entry, updated_at_utc: now, deleted_at_utc: now });
  };

  const mend = async (entry: WireEntry) => {
    const field = entry.kind === "day-entry" ? "body" : "note";
    const current = String(entry.doc[field] ?? "");
    const words = window.prompt("The words, mended:", current);
    if (words === null || words === current) return;
    await writeBack({
      ...entry,
      doc: { ...entry.doc, [field]: words },
      updated_at_utc: new Date().toISOString(),
    });
  };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all: WireEntry[] = [];
        let since = 0;
        // Page until the shelf is read whole. The server caps each page;
        // a record grown past a few thousand entries still arrives, just
        // in more than one breath.
        for (;;) {
          const page = await apiGet<PullResult>(`/record/entries?since=${since}&limit=500`);
          all.push(...page.entries);
          since = page.next_since;
          if (!page.more) break;
        }
        if (!cancelled) setEntries(all);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Where the record was kept, for the frame boundaries: the newest entry
  // that carried a coordinate. The page groups one record, and a record is
  // kept where its practitioner is.
  const placeOf = (held: WireEntry[]): { lat: number; lon: number } | null => {
    for (const one of [...held].reverse()) {
      const sky = one.doc.context;
      if (sky?.latitude != null && sky.longitude != null) {
        return { lat: sky.latitude, lon: sky.longitude };
      }
    }
    return null;
  };

  // The boundaries for the chosen frame, refetched when it changes. Civil
  // needs none — midnight is arithmetic.
  useEffect(() => {
    if (frame === "civil" || entries === null || entries.length === 0) {
      setFrameBounds(null);
      setFrameNote("");
      return;
    }
    const standing = entries.filter((e) => e.deleted_at_utc === null);
    const place = placeOf(standing);
    if (place === null) {
      setFrameBounds(null);
      setFrameNote("No keeping carries a place yet, so the days stay civil until one does.");
      return;
    }
    const moments = standing
      .filter((e) => EVENT_KINDS.has(e.kind))
      .map((e) => new Date(atOf(e)).getTime());
    if (moments.length === 0) return;
    const from = new Date(Math.min(...moments) - 86400000).toISOString();
    const to = new Date(Math.max(...moments) + 86400000).toISOString();
    let cancelled = false;
    (async () => {
      try {
        const got = await apiGet<{ boundaries: string[] }>(
          `/record/day-frames?frame=${frame}&from=${encodeURIComponent(from)}` +
            `&to=${encodeURIComponent(to)}&latitude=${place.lat}` +
            `&longitude=${place.lon}`,
        );
        if (!cancelled) {
          setFrameBounds(got.boundaries);
          setFrameNote("");
        }
      } catch (e) {
        if (!cancelled) {
          setFrameBounds(null);
          setFrameNote(
            `The frame boundaries could not be fetched (${
              e instanceof Error ? e.message : String(e)
            }); the days stay civil for now.`,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [frame, entries]);

  if (error) {
    return (
      <div style={pageStyle}>
        <p role="alert" style={{ color: "var(--care)" }}>
          {error}
        </p>
      </div>
    );
  }
  if (entries === null) {
    return <div style={pageStyle} aria-busy="true" />;
  }

  // Tombstones are real entries that say "removed" — but a reading of the
  // record shows what stands, exactly as the phone's own reader does. And
  // the shelf holds definitions beside events: the definitions lend their
  // names and stay off the days.
  const names = namesFrom(entries.filter((e) => e.deleted_at_utc === null));
  const everything = entries.filter((e) => e.deleted_at_utc === null && EVENT_KINDS.has(e.kind));
  const until = endOfSpan(from, span);
  const filterCount = kindFilter.size + skyFilter.size + (words.trim() ? 1 : 0);
  const standing = everything.filter((e) => {
    const at = new Date(atOf(e));
    if (at < from || at >= until) return false;
    if (kindFilter.size > 0 && !kindFilter.has(e.kind)) return false;
    if (skyFilter.size > 0) {
      const held = new Set(skyClausesOf(e));
      for (const clause of skyFilter) if (!held.has(clause)) return false;
    }
    return matchesWords(e, words, names);
  });

  // The chips offer only what the record holds, each with how often —
  // the difference between a condition worth asking about and a
  // coincidence, as the phone's filter sheet shows it.
  const skyVocabulary = new Map<string, number>();
  for (const e of everything) {
    for (const clause of skyClausesOf(e)) {
      skyVocabulary.set(clause, (skyVocabulary.get(clause) ?? 0) + 1);
    }
  }
  const vocabulary = [...skyVocabulary.entries()].sort((a, b) => b[1] - a[1]);

  const toggle = (held: Set<string>, key: string, write: (next: Set<string>) => void) => {
    const next = new Set(held);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    write(next);
  };

  if (everything.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ font: "var(--type-h3)", marginTop: 0 }}>Nothing here yet</h2>
          <p style={proseStyle}>
            The record fills from a linked device. In the Theourgia app, link this account under{" "}
            <em>Settings → Linked account</em>, then press
            <em> Sync the record now</em> — every keeping arrives whole, sky and all, and stands
            here as well as there.
          </p>
        </div>
      </div>
    );
  }

  // The phone's day frames need the ephemeris; until the site carries one,
  // days here are civil days in the viewer's own timezone — said on the
  // page, so nobody mistakes it for the moonrise day they configured.
  // The day an entry belongs to: the calendar's, or the practitioner's —
  // the span between two rises of the frame's body, named by the moment
  // the day OPENED.
  const dayOf = (entry: WireEntry): string => {
    const at = new Date(atOf(entry));
    if (frame !== "civil" && frameBounds && frameBounds.length > 0) {
      let opened: string | null = null;
      for (const boundary of frameBounds) {
        if (new Date(boundary) <= at) opened = boundary;
        else break;
      }
      if (opened !== null) {
        const from = new Date(opened);
        const label = from.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const clock = from.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${label} · from ${frame} at ${clock}`;
      }
      return "Before the first boundary";
    }
    return at.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const byDay = new Map<string, WireEntry[]>();
  for (const entry of standing) {
    const day = dayOf(entry);
    const list = byDay.get(day) ?? [];
    list.push(entry);
    byDay.set(day, list);
  }
  const days = [...byDay.entries()].sort((a, b) => {
    const first = a[1][0];
    const second = b[1][0];
    const at = first ? new Date(atOf(first)).getTime() : 0;
    const bt = second ? new Date(atOf(second)).getTime() : 0;
    return bt - at;
  });

  return (
    <div style={pageStyle} data-route="record">
      <div style={spanBarStyle}>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.keys(SPAN_LABELS) as RecordSpan[]).map((one) => (
            <button
              key={one}
              type="button"
              aria-pressed={one === span}
              onClick={() => {
                setSpan(one);
                setFrom(startOfSpan(new Date(), one));
              }}
              style={{
                ...spanPillStyle,
                borderColor: one === span ? "var(--accent)" : "var(--line)",
                color: one === span ? "var(--accent)" : "var(--ink-soft)",
              }}
            >
              {SPAN_LABELS[one]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <button
            type="button"
            aria-label="Earlier"
            onClick={() => setFrom(stepSpan(from, span, -1))}
            style={stepStyle}
          >
            ‹
          </button>
          <span style={{ font: "var(--type-caption)", color: "var(--ink)", minWidth: "7.5em", textAlign: "center" }}>
            {spanLabel(from, span)}
          </span>
          <button
            type="button"
            aria-label="Later"
            onClick={() => setFrom(stepSpan(from, span, 1))}
            style={stepStyle}
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              ...stepStyle,
              color: filterCount > 0 ? "var(--accent)" : "var(--muted)",
              fontSize: 13,
            }}
          >
            What to look for
          </button>
        </div>
      </div>

      {filterOpen ? (
        <div style={filterPanelStyle}>
          <div style={filterEyebrowStyle}>What kind</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {KIND_CHOICES.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={kindFilter.has(kind)}
                onClick={() => toggle(kindFilter, kind, setKindFilter)}
                style={{
                  ...chipStyle,
                  borderColor: kindFilter.has(kind) ? "var(--accent)" : "var(--line)",
                  color: kindFilter.has(kind) ? "var(--accent)" : "var(--ink-soft)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {vocabulary.length > 0 ? (
            <>
              <div style={filterEyebrowStyle}>Under what sky</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {vocabulary.map(([clause, count]) => (
                  <button
                    key={clause}
                    type="button"
                    aria-pressed={skyFilter.has(clause)}
                    onClick={() => toggle(skyFilter, clause, setSkyFilter)}
                    style={{
                      ...chipStyle,
                      borderColor: skyFilter.has(clause) ? "var(--accent)" : "var(--line)",
                      color: skyFilter.has(clause) ? "var(--accent)" : "var(--ink-soft)",
                    }}
                  >
                    {skyClauseLabel(clause)}{" "}
                    <span style={{ color: "var(--muted)" }}>{count}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div style={filterEyebrowStyle}>Words</div>
          <input
            value={words}
            onChange={(event) => setWords(event.target.value)}
            placeholder="In the entry's own words…"
            style={wordsInputStyle}
          />
        </div>
      ) : null}

      {filterCount > 0 ? (
        <button type="button" onClick={() => setFilterOpen(true)} style={lookingForStyle}>
          {filterCount === 1 ? "Looking for one thing." : `Looking for ${filterCount} things at once.`}
        </button>
      ) : null}

      <p style={hintStyle}>
        An entry opened here can be mended or removed; the devices learn of it at their next sync,
        by the same rules they push with.
      </p>
      <p style={hintStyle}>
        Days run{" "}
        <select
          aria-label="Day frame"
          value={frame}
          onChange={(event) => setFrame(event.target.value as "civil" | "sunrise" | "moonrise")}
          style={frameSelectStyle}
        >
          <option value="civil">midnight to midnight</option>
          <option value="sunrise">sunrise to sunrise</option>
          <option value="moonrise">moonrise to moonrise</option>
        </select>
        {frame === "civil"
          ? " in your timezone."
          : " — computed by this server's ephemeris, so a keeping within a" +
            " minute of a boundary can sit on a different day than in the app."}
        {frameNote ? ` ${frameNote}` : ""}
      </p>
      {days.length === 0 ? (
        <p style={{ ...proseStyle, color: "var(--ink-soft)", padding: "var(--space-5) 0", textAlign: "center" }}>
          {filterCount === 0
            ? "Nothing was recorded in this span."
            : "Nothing in this span answers what you are looking for."}
        </p>
      ) : null}
      {days.map(([day, list]) => (
        <section key={day} style={{ ...cardStyle, marginBottom: "var(--space-4)" }}>
          <h2 style={{ font: "var(--type-h4)", marginTop: 0 }}>{day}</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {list
              .slice()
              .sort((a, b) => new Date(atOf(a)).getTime() - new Date(atOf(b)).getTime())
              .map((entry) => {
                const carried = rowEvent(entry);
                const quote = carried?.quote || entry.doc.note || entry.doc.body || "";
                const opened = detailsOf(entry);
                const line = (
                  <>
                    <span style={timeStyle}>
                      {new Date(atOf(entry)).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ color: "var(--ink)" }}>
                        {carried
                          ? carried.title
                          : entry.kind === "day-entry"
                            ? (DAY_ENTRY_KINDS[String(entry.doc.subjectKey ?? "")] ??
                              DAY_ENTRY_KINDS[
                                String((entry.doc as Record<string, unknown>).kind ?? "")
                              ] ??
                              "A day's entry")
                            : titleOf(entry.doc.subjectKey, names)}
                      </span>
                      {quote ? <span style={noteStyle}> — {quote}</span> : null}
                      <span style={metaStyle}>
                        {[
                          entry.doc.mood != null
                            ? `Mood ${MOODS[entry.doc.mood] ?? entry.doc.mood}`
                            : null,
                          entry.doc.bodyFeeling != null
                            ? `Body ${BODIES[entry.doc.bodyFeeling] ?? entry.doc.bodyFeeling}`
                            : null,
                          entry.doc.context?.moonSignIndex != null
                            ? `Moon in ${SIGNS[entry.doc.context.moonSignIndex]}`
                            : null,
                          entry.doc.context?.planetaryHourRuler
                            ? `hour of ${entry.doc.context.planetaryHourRuler}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </>
                );
                // The third level the phone has. Nothing more to say means
                // nothing to open, and the row stays a plain row.
                if (opened.length === 0) {
                  return (
                    <li key={entry.id} style={rowStyle}>
                      {line}
                    </li>
                  );
                }
                return (
                  <li key={entry.id}>
                    <details>
                      <summary style={{ ...rowStyle, cursor: "pointer" }}>{line}</summary>
                      <dl style={detailStyle}>
                        {opened.map(([label, value]) => (
                          <div key={label + value} style={detailRowStyle}>
                            <dt style={detailLabelStyle}>{label}</dt>
                            <dd style={detailValueStyle}>{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div style={detailActionsStyle}>
                        {(entry.kind === "observance" || entry.kind === "day-entry") && (
                          <button
                            type="button"
                            style={detailButtonStyle}
                            onClick={() => void mend(entry)}
                          >
                            Mend the words
                          </button>
                        )}
                        <button
                          type="button"
                          style={detailButtonStyle}
                          onClick={() => void remove(entry)}
                        >
                          Remove from the record
                        </button>
                      </div>
                    </details>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
  padding: "var(--space-4)",
};

const cardStyle: CSSProperties = {
  padding: "var(--space-4)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
};

const proseStyle: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--ink)",
  lineHeight: 1.6,
};

const hintStyle: CSSProperties = {
  font: "var(--type-caption)",
  color: "var(--muted)",
  margin: "0 0 var(--space-3)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  padding: "var(--space-2) 0",
  borderTop: "1px solid var(--line)",
  font: "var(--type-body)",
  color: "var(--ink-soft)",
};

const timeStyle: CSSProperties = {
  font: "var(--type-mono, monospace)",
  color: "var(--muted)",
  minWidth: "3.5em",
};

const noteStyle: CSSProperties = {
  color: "var(--ink-soft)",
  fontStyle: "italic",
};

const detailStyle: CSSProperties = {
  margin: "0 0 var(--space-2) calc(3.5em + var(--space-3))",
  padding: "var(--space-2) var(--space-3)",
  borderLeft: "2px solid var(--line-2)",
  font: "var(--type-caption)",
};

const detailRowStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-2)",
  padding: "1px 0",
};

const detailLabelStyle: CSSProperties = {
  color: "var(--muted)",
  minWidth: "8em",
  margin: 0,
};

const detailValueStyle: CSSProperties = {
  color: "var(--ink-soft)",
  margin: 0,
  whiteSpace: "pre-wrap",
};

const detailActionsStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-3)",
  margin: "0 0 var(--space-2) calc(3.5em + var(--space-3))",
};

const frameSelectStyle: CSSProperties = {
  font: "var(--type-caption)",
  color: "var(--accent)",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const detailButtonStyle: CSSProperties = {
  font: "var(--type-caption)",
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

const metaStyle: CSSProperties = {
  display: "block",
  font: "var(--type-caption)",
  color: "var(--muted)",
  marginTop: 2,
};

const spanBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "var(--space-3)",
  marginBottom: "var(--space-3)",
};

const spanPillStyle: CSSProperties = {
  font: "var(--type-caption)",
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "none",
  cursor: "pointer",
};

const stepStyle: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--muted)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 6px",
};

const filterPanelStyle: CSSProperties = {
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-lg)",
  background: "var(--bg-2)",
  padding: "var(--space-3) var(--space-4)",
  marginBottom: "var(--space-3)",
};

const filterEyebrowStyle: CSSProperties = {
  font: "var(--type-caption)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--muted)",
  margin: "var(--space-3) 0 var(--space-2)",
};

const chipStyle: CSSProperties = {
  font: "var(--type-caption)",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "none",
  cursor: "pointer",
};

const wordsInputStyle: CSSProperties = {
  font: "var(--type-body)",
  color: "var(--ink)",
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  padding: "7px 10px",
  width: "100%",
  maxWidth: 360,
  marginBottom: "var(--space-2)",
};

const lookingForStyle: CSSProperties = {
  display: "block",
  font: "var(--type-caption)",
  color: "var(--accent)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  margin: "0 0 var(--space-3)",
  textAlign: "left",
};
