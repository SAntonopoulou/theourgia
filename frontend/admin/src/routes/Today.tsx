/**
 * Today — the landing surface.
 *
 * Composition tracks ``Theourgia Vault - Today.dc.html``:
 *   Left column  · Celestial Row (Planetary hour / Lunar phase / Transits)
 *                · Quick Capture (type chips + visibility + textarea)
 *                · Recent entries (colored left-edge bars, design taxonomy)
 *   Right rail   · Hours of the day, current hour highlighted
 *                · On this day (placeholder until historical query lands)
 *                · Motto
 *
 * Visibility selector is UI-only for now; the ACL field doesn't exist on
 * Entry yet. Dream / Sensation type chips map to ``observation`` until
 * the ContentType migration lands.
 */

import {
  type CelestialState,
  type EntryRecord,
  LunarPhaseWidget,
  type Planet,
  PromptDialog,
  Skeleton,
  Toast,
  type TodayLedger,
  TodayLedgerCards,
  TopbarSearch,
  useApiCall,
  useCelestial,
  useNarrowLayout,
  useSession,
  useTopbar,
} from "@theourgia/shared";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiMethods } from "../data/api.js";
import { DayBook } from "./DayBook.js";
import { TodayAgenda } from "./TodayAgenda.js";
import { createEntry, useRecentEntries } from "../data/useEntries.js";
import { useMyLocation } from "../data/useLocation.js";
import { usePractices } from "../data/usePractices.js";
import { MOCK_LOCATION } from "../mocks/today.js";
import {
  AwaitingJudgmentCard,
  TodayLunarChip,
  TodayLunarRow,
  TodayRiteRow,
} from "./TodayPractice.js";

// ─── Static maps ────────────────────────────────────────────────────────────

const PLANET_GLYPH: Record<Planet, string> = {
  sun: "☉",
  moon: "☽",
  mars: "♂",
  mercury: "☿",
  jupiter: "♃",
  venus: "♀",
  saturn: "♄",
};

const PLANET_LABEL: Record<Planet, string> = {
  sun: "Sun",
  moon: "Moon",
  mars: "Mars",
  mercury: "Mercury",
  jupiter: "Jupiter",
  venus: "Venus",
  saturn: "Saturn",
};

/**
 * Per-planet half-line evoking its temperament.
 * Echoes the design's "benefic · concord · art" subtitle on the Venus card.
 */
const PLANET_QUALITY: Record<Planet, string> = {
  sun: "vital · luminous · regal",
  moon: "tidal · reflective · feminine",
  mars: "kinetic · sundering · martial",
  mercury: "swift · clever · liminal",
  jupiter: "expansive · benefic · just",
  venus: "benefic · concord · art",
  saturn: "binding · ascetic · old",
};

type CaptureType = "synchronicity" | "dream" | "sensation" | "working";

const CAPTURE_LABEL: Record<CaptureType, string> = {
  synchronicity: "synchronicity",
  dream: "dream",
  sensation: "sensation",
  working: "working",
};

/**
 * The captures the homepage actually offers.
 *
 * ⚠ `synchronicity` is absent, and it is absent because its BROWSE page is
 * gated — see `HIDDEN_UNTIL_FINISHED` in PracticeNav. A chip that files
 * something away where nothing can read it back is worse than no chip: the
 * entry is really written, and the person who wrote it has no way to find it.
 *
 * ⚠ These four are the site's own vocabulary and the PHONE's is different —
 * it keeps practices, and notes carrying a Mood and a Body reading, with the
 * sky and the weather of the moment attached. Matching them properly is not a
 * relabelling; it needs the record model this site does not have yet. Sophia,
 * 15 August: *"the record needs to be added pretty much separate from the
 * journal."* Until that lands, this list only stops offering what it cannot
 * show back.
 */
const OFFERED_CAPTURES: readonly CaptureType[] = ["dream", "sensation", "working"];

const CAPTURE_COLOR: Record<CaptureType, string> = {
  synchronicity: "var(--c-synchronicity)",
  dream: "var(--c-divination)",
  sensation: "var(--c-entity)",
  working: "var(--c-working)",
};

/**
 * Bridge from the design's capture-type chips to the (still pre-migration)
 * backend EntryType enum. When the ContentType migration ships, this table
 * goes away and these become straight pass-throughs.
 */
const CAPTURE_TO_ENTRY_TYPE: Record<CaptureType, "synchronicity" | "observation" | "ritual"> = {
  synchronicity: "synchronicity",
  dream: "observation",
  sensation: "observation",
  working: "ritual",
};

const CAPTURE_GLYPH: Record<CaptureType, string> = {
  synchronicity: "synchronicity",
  dream: "moon",
  sensation: "feather",
  working: "ritual",
};

type Visibility = "personal" | "viewer" | "network" | "public" | "sealed";

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "viewer", label: "Viewer" },
  { value: "network", label: "Network" },
  { value: "public", label: "Public" },
  { value: "sealed", label: "Sealed" },
];

/** Map an EntryRecord's type to the design's color + uppercase label. */
function entryToneFor(t: EntryRecord["type"]): { color: string; label: string } {
  switch (t) {
    case "ritual":
      return { color: "var(--c-working)", label: "Working" };
    case "divination":
      return { color: "var(--c-divination)", label: "Divination" };
    case "synchronicity":
      return { color: "var(--c-synchronicity)", label: "Synchronicity" };
    case "capture":
      return { color: "var(--c-entity)", label: "Capture" };
    default:
      return { color: "var(--c-journal)", label: "Journal" };
  }
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function relativeTime(at: string | Date): string {
  const ms = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString();
}

/** "in 4h" / "2h ago" / "in 3d" — bidirectional relative formatter for
 *  the Today ledger cards. The negative-direction text reuses the
 *  same wording as the rest of the surface ("4h ago") for consistency. */
function relativeTimeBidirectional(iso: string): string {
  const target = new Date(iso).getTime();
  const delta = target - Date.now();
  const absMin = Math.round(Math.abs(delta) / 60_000);
  const sign = delta >= 0 ? "in " : "";
  const suffix = delta >= 0 ? "" : " ago";
  if (absMin < 60) return `${sign}${absMin}m${suffix}`;
  const hours = Math.round(absMin / 60);
  if (hours < 24) return `${sign}${hours}h${suffix}`;
  const days = Math.round(hours / 24);
  return `${sign}${days}d${suffix}`;
}

function clockLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "Friday, 20 June 2026" */
function fullDateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DAY_TO_LATIN: Record<number, string> = {
  0: "Dies Solis",
  1: "Dies Lunae",
  2: "Dies Martis",
  3: "Dies Mercurii",
  4: "Dies Jovis",
  5: "Dies Veneris",
  6: "Dies Saturni",
};

function ordinal(n: number): string {
  const s = ["ᵗʰ", "ˢᵗ", "ⁿᵈ", "ʳᵈ"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "";
  return `${n}${suffix}`;
}

// ─── Card sub-components ───────────────────────────────────────────────────

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 12px)",
  padding: 18,
  ...extra,
});

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

function PlanetaryHourCard({ c }: { c: CelestialState }) {
  const ruler = c.planetary.ruler;
  const remainingMin = Math.max(0, Math.round(c.hourRemainingMs / 60_000));
  return (
    <article style={cardStyle()}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span style={sectionLabel}>Planetary hour</span>
        <span
          className="nowdot"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--c-synchronicity)",
          }}
          aria-hidden="true"
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--font-glyph, var(--font-serif))",
            fontSize: 34,
            color: "var(--accent)",
            lineHeight: 1,
          }}
        >
          {PLANET_GLYPH[ruler]}
        </span>
        <div>
          <div style={{ fontFamily: "var(--font-display, var(--font-serif))", fontSize: 21 }}>
            Hour of {PLANET_LABEL[ruler]}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            {PLANET_QUALITY[ruler]}
          </div>
        </div>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "var(--bg-sunk, var(--bg))",
          overflow: "hidden",
          marginBottom: 7,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${(c.hourProgress * 100).toFixed(1)}%`,
            height: "100%",
            background: "var(--accent)",
            borderRadius: 3,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
        }}
      >
        <span>{remainingMin} min remaining</span>
        <span>
          next:{" "}
          <span
            aria-hidden="true"
            style={{ fontFamily: "var(--font-glyph, var(--font-serif))", color: "var(--ink-soft)" }}
          >
            {PLANET_GLYPH[c.nextRuler]}
          </span>{" "}
          {PLANET_LABEL[c.nextRuler]}
        </span>
      </div>
    </article>
  );
}

function TransitsCard({ c: _c }: { c: CelestialState }) {
  // Design's Transits card shows planet-aspect glyphs (☽ □ ♂, ☉ △ ♄, ☿ → ♋
  // with exact times). Computing real transits needs a full ephemeris engine
  // (see ``transitsOfNote`` signature in agent_data_and_components §10) which
  // hasn't shipped. Honest empty state until it does — fake transits would
  // mislead practitioners.
  return (
    <article style={cardStyle()}>
      <div style={{ ...sectionLabel, marginBottom: 14 }}>Transits of note</div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12.5,
          color: "var(--ink-mute)",
          lineHeight: 1.5,
        }}
      >
        Aspect calculations come online with the ephemeris engine.
      </div>
    </article>
  );
}

// ─── Quick capture ──────────────────────────────────────────────────────────

function QuickCapture({
  onCapture,
}: {
  onCapture: (input: { type: CaptureType; visibility: Visibility }) => void;
}) {
  const [captureType, setCaptureType] = useState<CaptureType>("dream");
  const [visibility, setVisibility] = useState<Visibility>("personal");
  // v1-053: five segments at full padding are ~4px wider than a 390px
  // phone; tighten the padding on narrow screens and let the group
  // scroll on its own axis as the fallback floor.
  const narrow = useNarrowLayout();

  return (
    <article style={cardStyle({ padding: 20 })}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {OFFERED_CAPTURES.map((t) => {
          const selected = t === captureType;
          return (
            <button
              key={t}
              type="button"
              data-chip
              onClick={() => setCaptureType(t)}
              aria-pressed={selected}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                border: `1px solid ${selected ? "var(--line-2)" : "var(--line)"}`,
                borderRadius: "var(--r-pill, 999px)",
                background: selected ? "var(--accent-soft)" : "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                color: selected ? "var(--ink)" : "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: CAPTURE_COLOR[t],
                }}
                aria-hidden="true"
              />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onCapture({ type: captureType, visibility })}
        style={{
          all: "unset",
          minHeight: 54,
          padding: "4px 2px",
          width: "100%",
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          color: "var(--ink-mute)",
          borderBottom: "1px solid var(--line)",
          cursor: "text",
          display: "block",
        }}
        aria-label={`Record a ${CAPTURE_LABEL[captureType]}`}
      >
        Record a {CAPTURE_LABEL[captureType]}
        <span style={{ color: "var(--accent)" }}>_</span>
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          Visibility
        </span>
        <div
          style={{
            display: "flex",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md, 6px)",
            overflowX: "auto",
            overflowY: "hidden",
            maxWidth: "100%",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
          }}
        >
          {VISIBILITY_OPTIONS.map((opt, i) => {
            const selected = opt.value === visibility;
            return (
              <button
                key={opt.value}
                type="button"
                data-vis
                onClick={() => setVisibility(opt.value)}
                aria-pressed={selected}
                style={{
                  padding: narrow ? "7px 9px" : "7px 12px",
                  whiteSpace: "nowrap",
                  flex: "none",
                  borderLeft: i === 0 ? "none" : "1px solid var(--line)",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  color: selected ? "var(--ink)" : "var(--ink-soft)",
                  cursor: "pointer",
                  display: opt.value === "sealed" ? "flex" : "inline-block",
                  alignItems: "center",
                  gap: opt.value === "sealed" ? 5 : 0,
                }}
              >
                {opt.value === "sealed" ? (
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <title>Sealed</title>
                    <rect x="5" y="11" width="14" height="9" rx="1.5" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                ) : null}
                {opt.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onCapture({ type: captureType, visibility })}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 18px",
            borderRadius: "var(--r-md, 6px)",
            background: "var(--accent)",
            color: "var(--accent-ink, white)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
        >
          <span>Capture</span>
          <span
            aria-hidden="true"
            style={{ fontFamily: "var(--font-mono)", fontSize: 12, opacity: 0.85 }}
          >
            ⌘↵
          </span>
        </button>
      </div>
    </article>
  );
}

// ─── Recent entries ────────────────────────────────────────────────────────

function EntryRow({ entry, isLast }: { entry: EntryRecord; isLast: boolean }) {
  const tone = entryToneFor(entry.type);
  return (
    <article
      className="entry-row"
      style={{
        display: "flex",
        gap: 14,
        padding: "16px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--line)",
        transition: "background-color 0.15s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 3,
          borderRadius: 3,
          background: tone.color,
          flex: "none",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: tone.color,
            }}
          >
            {tone.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              color: "var(--ink-mute)",
            }}
          >
            {relativeTime(entry.created_at)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 18,
            marginBottom: 3,
          }}
        >
          {entry.title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 14.5,
            color: "var(--ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {entry.excerpt}
        </div>
      </div>
    </article>
  );
}

function RecentEntriesSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={`recent-skel-${i}`}
          style={{
            display: "flex",
            gap: 14,
            padding: "16px 18px",
            borderBottom: i < 2 ? "1px solid var(--line)" : "none",
          }}
        >
          <span style={{ width: 3, borderRadius: 3, background: "var(--line)" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton kind="text" width={120} />
            <Skeleton kind="text" width={260} />
            <Skeleton kind="text" width={320} />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Right rail ─────────────────────────────────────────────────────────────

function HoursOfDayCard({ c }: { c: CelestialState }) {
  // Walk forward from the current planetary hour, six rows total. We can
  // approximate adjacent hours by stepping in the Chaldean cycle and using
  // the current hour's length (day-hour vs night-hour) until we cross the
  // sunrise / sunset boundary — for the design's purpose, showing the
  // current hour highlighted with neighbors is the goal.
  const CHAL_ORDER: Planet[] = ["saturn", "jupiter", "mars", "sun", "venus", "mercury", "moon"];
  const rows: { ruler: Planet; startsAt: Date; isNow: boolean }[] = [];
  const span = c.planetary.endsAt.getTime() - c.planetary.startsAt.getTime();
  const currentIdx = CHAL_ORDER.indexOf(c.planetary.ruler);
  // Start two hours before "now" so the highlighted hour sits in the middle.
  for (let offset = -2; offset <= 3; offset += 1) {
    const idx =
      (((currentIdx + offset) % CHAL_ORDER.length) + CHAL_ORDER.length) % CHAL_ORDER.length;
    const startsAt = new Date(c.planetary.startsAt.getTime() + offset * span);
    rows.push({
      ruler: CHAL_ORDER[idx] as Planet,
      startsAt,
      isNow: offset === 0,
    });
  }

  return (
    <article style={cardStyle()}>
      <div style={{ ...sectionLabel, marginBottom: 16 }}>Hours of the day</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          fontFamily: "var(--font-ui)",
          fontSize: 13,
        }}
      >
        {rows.map((row) =>
          row.isNow ? (
            <div
              key={`hour-${row.startsAt.toISOString()}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: 8,
                borderRadius: "var(--r-md, 6px)",
                background: "var(--accent-soft)",
                boxShadow: "inset 2px 0 0 var(--accent)",
                color: "var(--ink)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-glyph, var(--font-serif))",
                  fontSize: 16,
                  width: 18,
                  textAlign: "center",
                  color: "var(--accent)",
                }}
              >
                {PLANET_GLYPH[row.ruler]}
              </span>
              <span style={{ flex: 1, fontWeight: 700 }}>{PLANET_LABEL[row.ruler]}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  color: "var(--accent)",
                }}
              >
                now
              </span>
            </div>
          ) : (
            <div
              key={`hour-${row.startsAt.toISOString()}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "6px 8px",
                color: "var(--ink-mute)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: "var(--font-glyph, var(--font-serif))",
                  fontSize: 15,
                  width: 18,
                  textAlign: "center",
                }}
              >
                {PLANET_GLYPH[row.ruler]}
              </span>
              <span style={{ flex: 1 }}>{PLANET_LABEL[row.ruler]}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                {clockLabel(row.startsAt)}
              </span>
            </div>
          ),
        )}
      </div>
    </article>
  );
}

function MottoCard() {
  return (
    <div style={{ textAlign: "center", padding: "6px 8px" }}>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-serif))",
          fontStyle: "italic",
          fontSize: 17,
          color: "var(--ink-soft)",
        }}
      >
        <span lang="el" style={{ fontFamily: "var(--font-glyph, var(--font-serif))" }}>
          ἓν τὸ πᾶν.
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          color: "var(--ink-mute)",
          marginTop: 3,
        }}
      >
        All is one.
      </div>
    </div>
  );
}

// ─── Topbar content (rendered in the VaultTopbar slot via useTopbar) ───────

function buildTopbarSubtitle(c: CelestialState): React.ReactNode {
  const dayLatin = DAY_TO_LATIN[c.now.getDay()] ?? "";
  // Friendly: combine day-band 1..12 + night-band 13..24 into "Xᵗʰ hour" style.
  const hourIndex =
    c.planetary.band === "day" ? c.planetary.indexInBand : 12 + c.planetary.indexInBand;
  return (
    <>
      <span>{fullDateLabel(c.now)}</span>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>
        ·
      </span>
      <span style={{ color: "var(--accent)" }}>
        {dayLatin} · {ordinal(hourIndex)} hour
      </span>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Today() {
  const session = useSession();
  const locationCall = useMyLocation({ enabled: session !== null });
  const location = locationCall.data ?? MOCK_LOCATION;
  const entries = useRecentEntries();

  const celestial = useCelestial({ lat: location.lat, lng: location.lng });

  // Register Today's title + subtitle + search affordance into the topbar
  // slot. The factory rebuilds when the planetary-hour or the calendar day
  // changes — both are stable primitives, so the registration doesn't
  // thrash on every render.
  const hourKey = celestial.planetary.startsAt.getTime();
  const dayKey = celestial.now.toDateString();
  useTopbar(
    () => ({
      title: "Today",
      subtitle: buildTopbarSubtitle(celestial),
      before: <TopbarSearch />,
    }),
    [hourKey, dayKey],
  );

  // PromptDialog supplies the body text once the user types it. We carry
  // the type+visibility selection out of QuickCapture into the dialog via
  // local state.
  const [pending, setPending] = useState<{ type: CaptureType; visibility: Visibility } | null>(
    null,
  );

  // Cap to four most-recent entries, matching the design's frame.
  const recent = useMemo(() => (entries.data ?? []).slice(0, 4), [entries.data]);

  // Phase-05 Today ledger — four cards in the right rail (active practices,
  // obligations, servitor feeding, attestation activity). Loads after auth.
  const ledger = useApiCall<TodayLedger>((signal) => apiMethods.getTodayLedger({ signal }), {
    skip: session === null,
  });

  // Web parity with the phone (20 Aug): the eight built-in disciplines are
  // gated by the practitioner's on/off toggles. A switched-off practice must
  // not appear on Today — the phone's day assembler never even assembles an
  // off practice's stations (lib/data/day_assembly.dart; the toggle set is
  // default-ON, subtractive). Here that means the solar rite and the lunar
  // chip only mount when their discipline is enabled.
  const practices = usePractices({ enabled: session !== null });
  const enabledPractices = useMemo(() => {
    const set = new Set<string>();
    for (const p of practices.data?.practices ?? []) {
      if (p.enabled) set.add(p.key);
    }
    return set;
  }, [practices.data]);
  // Signed out → show (the demo view); signed in → wait for the toggle set to
  // load, then honor it, so a disabled discipline never flashes in first.
  const practiceOn = (key: string): boolean =>
    session === null ? true : practices.data != null && enabledPractices.has(key);

  useEffect(() => {
    if (entries.status === "error") {
      Toast.push({
        tone: "error",
        title: "Could not load entries",
        body: entries.error?.message ?? "Unknown error fetching from the API.",
      });
    }
  }, [entries.status, entries.error]);

  async function handleCapture(value: string): Promise<void> {
    if (!pending) return;
    const { type } = pending;
    setPending(null);
    try {
      await createEntry({
        title: value.slice(0, 64),
        type: CAPTURE_TO_ENTRY_TYPE[type],
        excerpt: value,
        glyph: CAPTURE_GLYPH[type],
      });
      Toast.push({ tone: "success", title: "Captured" });
      await entries.refresh();
    } catch (e) {
      Toast.push({
        tone: "error",
        title: "Could not capture",
        body: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <>
      {/* H12 ultrawide rule: the content column is capped, not stretched —
          --shell-content-max only resolves above 1680px. */}
      <div
        style={{
          maxWidth: "min(1280px, var(--shell-content-max, 1280px))",
          margin: "0 auto",
          minWidth: 0,
        }}
      >
        {/* v1-068: two grid tracks only in the desktop bands. Below 1280
            the .td-cols override in theourgia.shared.css collapses this to
            a single column so the right rail STACKS under the main column
            instead of squeezing the station cards / clipping off-screen. */}
        <div
          className="td-cols"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            alignItems: "start",
            gap: 24,
          }}
        >
          {/* LEFT */}
          <div
            style={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {/* What today asks beyond adorations — scheduled rites/sittings due
                today and the working items, each one-tap keepable (self-hides
                when there's nothing scheduled or running). */}
            {session !== null ? <TodayAgenda /> : null}

            {/* H12 — the lunar-day chip: what day it is in the Attic
                calendar and what that day asks. Gated by lunar adorations,
                the discipline it belongs to (20 Aug — like the phone). */}
            {practiceOn("lunarAdorations") ? <TodayLunarChip /> : null}

            {/* The four lunar stations — the lunar counterpart of the solar
                rite below, so lunar adorations is no longer just a chip. */}
            {practiceOn("lunarAdorations") ? (
              <TodayLunarRow lat={location.lat} lng={location.lng} />
            ) : null}

            {/* H12 — the four-station rite row: first mount of the
                LiberResh family on the home surface. Gated by solar
                adorations, so switching that discipline off removes it. */}
            {practiceOn("solarAdorations") ? (
              <TodayRiteRow lat={location.lat} lng={location.lng} />
            ) : null}

            {/* Discoverable path to the on/off toggles — what appears here is
                governed by which practices are switched on. */}
            {session !== null ? (
              <Link
                to="/settings/practices"
                style={{
                  alignSelf: "flex-start",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  color: "var(--ink-mute)",
                  textDecoration: "none",
                }}
              >
                Manage practices →
              </Link>
            ) : null}

            {/* Celestial row — small cards for the planetary hour + transits */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(178px, 1fr))",
                gap: 16,
              }}
            >
              <PlanetaryHourCard c={celestial} />
              <TransitsCard c={celestial} />
            </div>

            {/* The bigger lunar embed — designer-specified per the H01-H03
                Today Widgets handoff. Hemisphere follows the practitioner's
                latitude (lat > 0 → northern; equatorial defaults to north). */}
            <LunarPhaseWidget
              daysSinceNewMoon={celestial.lunarPhase * 29.53059}
              hemisphere={location.lat >= 0 ? "north" : "south"}
            />

            {/* Quick capture */}
            <QuickCapture onCapture={(input) => setPending(input)} />

            {/* The day book — waking/sleeping/dreams/notes into the record, the
                phone's day journal (writes that cross to the phone). */}
            {session !== null ? <DayBook /> : null}

            {/* Recent entries */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display, var(--font-serif))",
                    fontSize: 22,
                  }}
                >
                  Recent entries
                </h2>
                <Link
                  to="/journal"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  Open journal →
                </Link>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-lg, 12px)",
                  overflow: "hidden",
                  background: "var(--bg-2)",
                }}
              >
                {entries.status === "loading" ? (
                  <RecentEntriesSkeleton />
                ) : recent.length > 0 ? (
                  recent.map((e, i) => (
                    <EntryRow key={e.id} entry={e} isLast={i === recent.length - 1} />
                  ))
                ) : (
                  <div
                    style={{
                      padding: "24px 18px",
                      fontFamily: "var(--font-serif)",
                      fontSize: 14.5,
                      color: "var(--ink-mute)",
                      textAlign: "center",
                    }}
                  >
                    No entries yet. Capture an observation above to begin.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              minWidth: 0,
            }}
          >
            <HoursOfDayCard c={celestial} />
            {ledger.status === "ok" && ledger.data ? (
              <TodayLedgerCards ledger={ledger.data} formatRelative={relativeTimeBidirectional} />
            ) : null}
            {/* H12 — the due row's verdict slot; gracefully empty until
                the two-gate queue endpoint exists. Replaces the old
                "On this day" placeholder card. */}
            <AwaitingJudgmentCard />
            <MottoCard />
          </aside>
        </div>
      </div>

      <PromptDialog
        open={pending !== null}
        title="Quick capture"
        label={`Record a ${pending ? CAPTURE_LABEL[pending.type] : "note"}`}
        placeholder="What did you notice?"
        validate={(v) => (v.trim().length < 3 ? "A few words at least." : null)}
        confirmLabel="Capture"
        onSubmit={(value) => void handleCapture(value)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
