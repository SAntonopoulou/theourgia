/**
 * The record — the phone's ledger of practice, synced here and read whole.
 *
 * Sophia's ruling, held to the letter: the record is NOT the journal. The
 * journal is entries with a type and a visibility; this is a timed ledger
 * of what was done — keepings with a Mood and a Body reading, notes in
 * whatever tongue the rite demanded, each carrying the sky it happened
 * under. It arrives by sync from a linked device and rests in
 * `record_entry` as whole documents; this page reads them and nothing
 * else. READ-ONLY deliberately: the server is a shelf, not an author, and
 * editing from here comes later, through the same conflict rules the
 * devices obey.
 *
 * Days first, newest first, then a day's entries in the order they were
 * kept — the phone's own three levels, minus one until entries grow a
 * detail view worth opening.
 *
 * Mounted at /record.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useState } from "react";

import { apiGet } from "../lib/api.js";

type WireEntry = {
  id: string;
  kind: string;
  doc: {
    subjectKey?: string;
    observedAt?: string;
    at?: string;
    note?: string;
    body?: string;
    mood?: number | null;
    bodyFeeling?: number | null;
    /** Subject kinds carry the whole device row here. */
    row?: Record<string, unknown>;
    context?: {
      moonSignIndex?: number | null;
      planetaryHourRuler?: string | null;
      sect?: string | null;
      locationLabel?: string | null;
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

export function RecordRoute() {
  useTopbar(
    () => ({
      title: "The record",
      subtitle: "What was done, as the devices keep it",
    }),
    [],
  );

  const [entries, setEntries] = useState<WireEntry[] | null>(null);
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
  const standing = entries.filter((e) => e.deleted_at_utc === null && EVENT_KINDS.has(e.kind));

  if (standing.length === 0) {
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
  const byDay = new Map<string, WireEntry[]>();
  for (const entry of standing) {
    const day = new Date(atOf(entry)).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <p style={hintStyle}>
        Days run midnight to midnight in your timezone here; the app groups by your chosen frame.
        Read-only for now — mend entries on the device that keeps them.
      </p>
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
                return (
                  <li key={entry.id} style={rowStyle}>
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

const metaStyle: CSSProperties = {
  display: "block",
  font: "var(--type-caption)",
  color: "var(--muted)",
  marginTop: 2,
};
