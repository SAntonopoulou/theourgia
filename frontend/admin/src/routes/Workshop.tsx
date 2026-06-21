/**
 * Workshop admin — builders + quick instruments.
 *
 * Faithful port of ``Theourgia Workshop.dc.html``. The design provides
 * working engine implementations marked "ACCURATE" per
 * `agent_data_and_components.md §10`: Latin gematria, Chaldean
 * planetary-hour rotation, barbarous-name generator. These are ported
 * verbatim from the `.dc.html` `<script>` block so the surface is live
 * from day one — full Phase 07/08 engines (Hebrew/Greek gematria,
 * sunrise-based planetary hours, etc.) replace these in the wiring
 * pass without touching this surface's shape.
 */

import { useTopbar } from "@theourgia/shared";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

const LINE = "var(--line)";
const LINE_2 = "var(--line-2)";

// — Builder cards (3, link to existing routes) —
//
// Icon structure ported verbatim from the source `.dc.html` (lines 122,
// 127, 132): each is one outer circle, optionally an inner circle, plus
// a path of inner strokes.
const BUILDERS: {
  href: string;
  title: string;
  body: string;
  innerCircleR?: number;
  innerPath: string;
}[] = [
  {
    href: "/sigil",
    title: "Sigil Studio",
    body: "Intent → kamea construction, traced and saved.",
    innerPath: "M12 3v18M5 8l14 8M19 8 5 16",
  },
  {
    href: "/talismans",
    title: "Talisman Designer",
    body: "Planetary squares, names, and the traced seal.",
    innerCircleR: 4.5,
    innerPath: "M12 3v3M12 18v3M3 12h3M18 12h3",
  },
  {
    href: "/circle",
    title: "Circle Builder",
    body: "Quarters, names of power, the triangle of art.",
    innerCircleR: 5,
    innerPath: "M12 3v4M12 17v4M3 12h4M17 12h4",
  },
];

// — Latin gematria (Cornelius Agrippa order; a=1..i=9, j=10..r=90, s=100..z=800) —
function gematriaValues(input: string): { full: number; ordinal: number; reduced: number } {
  const letters = input.toLowerCase().replace(/[^a-z]/g, "");
  const ord = (c: string) => c.charCodeAt(0) - 96; // a=1..z=26
  const fullOf = (c: string) => {
    const n = ord(c);
    return n <= 9 ? n : n <= 18 ? (n - 9) * 10 : (n - 18) * 100;
  };
  const sumWith = (fn: (c: string) => number) => letters.split("").reduce((a, c) => a + fn(c), 0);
  const ordinal = sumWith(ord);
  const full = sumWith(fullOf);
  let reduced = ordinal;
  while (reduced > 9) reduced = String(reduced).split("").reduce((a, d) => a + Number(d), 0);
  return { full, ordinal, reduced };
}

// — Chaldean planetary hours (approximate, clock-based) —
const CHALDEAN: { n: string; g: string }[] = [
  { n: "Saturn", g: "♄" },
  { n: "Jupiter", g: "♃" },
  { n: "Mars", g: "♂" },
  { n: "Sun", g: "☉" },
  { n: "Venus", g: "♀" },
  { n: "Mercury", g: "☿" },
  { n: "Moon", g: "☽" },
];
const DAY_RULER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function planetaryHourNow(now: Date) {
  const dayIdx = now.getDay();
  const startName = DAY_RULER[dayIdx]!;
  const start = CHALDEAN.findIndex((c) => c.n === startName);
  const hourNum = now.getHours();
  const hourRuler = (i: number) => CHALDEAN[(start + i) % 7]!;
  const fmt = (h: number) => `${(((h % 24) + 24) % 24).toString().padStart(2, "0")}:00`;
  const cur = hourRuler(hourNum);
  const next = [1, 2, 3].map((k) => ({
    glyph: hourRuler(hourNum + k).g,
    name: hourRuler(hourNum + k).n,
    at: fmt(hourNum + k),
  }));
  return { current: cur, day: DAY_NAMES[dayIdx]!, next };
}

// — Barbarous name generator (PGM-style vocables) —
const NAME_PRE = ["Abla", " Semes", "Iao", "Saba", "Ablan", "Bar", "Ereš", "Phno", "Marma", "Damna", "Akram", "Sesen", "Iarba", "Pheth", "Achra"];
const NAME_MID = ["natha", "ōth", "baō", "reibe", "thalla", "machō", "iaō", "peteph", "sentha", "rarach", "meu", "phorba", "xanth", "grammē", "baren"];
const NAME_SUF = ["nalba", "meu", "phthē", "ōth", "rachei", "agra", "iaō", "setho", "barēs", "kanphe", "thōn", "xixax", "ēïē", "phnō", "arxas"];

function rollBarbarous(): string {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
  const raw = `${pick(NAME_PRE)}${pick(NAME_MID)}${pick(NAME_SUF)}`.trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// — Sortilege oracles —
const ORACLES = [
  "The thing you delay will not improve by waiting. Begin, and badly if you must.",
  "A door opens behind you, not ahead. Turn around before you knock again.",
  "What you take for an obstacle is a measure of how much you want it.",
  "Speak less this week. The answer is in the room already, waiting to be heard.",
  "The omen is favourable, but the hour is not. Keep the intent; move the date.",
  "You have asked the wrong question. Sit with the one beneath it.",
  "Hold. The river you would cross will be shallower by the new moon.",
  "Yes — but not from the quarter you expect. Watch the West.",
];
const SORS_LABELS = ["Sors I", "Sors II", "Sors III", "Sors IV", "Sors V", "Sors VI", "Sors VII", "Sors VIII"];

function BuilderCard({ href, title, body, innerCircleR, innerPath }: (typeof BUILDERS)[number]) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 20,
        border: `1px solid ${LINE}`,
        borderRadius: "var(--r-lg)",
        background: "var(--bg-2)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = LINE_2;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = LINE;
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--r-md)",
          background: "var(--accent-soft)",
          border: `1px solid ${LINE_2}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
        }}
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          {innerCircleR ? <circle cx="12" cy="12" r={innerCircleR} /> : null}
          <path d={innerPath} />
        </svg>
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-mute)", marginTop: 4 }}>{body}</div>
      </div>
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--accent)" }}>Open →</span>
    </a>
  );
}

function ToolHeading({ glyph, glyphColor, title }: { glyph: string; glyphColor: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{ fontFamily: "var(--font-glyph)", color: glyphColor, fontSize: 18 }} aria-hidden="true">
        {glyph}
      </span>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: 0 }}>{title}</h3>
    </div>
  );
}

function GematriaCard() {
  const [input, setInput] = useState("Abraxas");
  const { full, ordinal, reduced } = useMemo(() => gematriaValues(input), [input]);

  const valStyle: CSSProperties = {
    textAlign: "center",
    padding: "12px 6px",
    border: `1px solid ${LINE}`,
    borderRadius: "var(--r-md)",
    background: "var(--bg)",
  };

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
      <ToolHeading glyph="ℵ" glyphColor="var(--c-entity)" title="Gematria calculator" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 13px",
          border: `1px solid ${LINE_2}`,
          borderRadius: "var(--r-md)",
          background: "var(--bg)",
          marginBottom: 16,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }} aria-hidden="true">
          <path d="M4 7V5h16v2M9 19h6M12 5v14" />
        </svg>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Word to compute"
          placeholder="a word…"
          style={{
            flex: 1,
            fontFamily: "var(--font-serif)",
            fontSize: 16,
            color: "var(--ink)",
            background: "transparent",
            border: "none",
            outline: "none",
            minWidth: 0,
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div style={valStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--accent)", lineHeight: 1 }}>{full}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 5 }}>Full</div>
        </div>
        <div style={valStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{ordinal}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 5 }}>Ordinal</div>
        </div>
        <div style={valStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 24, color: "var(--ink)", lineHeight: 1 }}>{reduced}</div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)", marginTop: 5 }}>Reduced</div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-mute)", marginTop: 12 }}>
        Latin order (a=1…i=9, j=10…r=90, s=100…z=800).{" "}
        <a href="/entities" style={{ color: "var(--accent)" }}>
          Find entities by value →
        </a>
      </div>
    </div>
  );
}

function PlanetaryHourCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);
  const { current, day, next } = planetaryHourNow(now);

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
      <ToolHeading glyph="☉" glyphColor="var(--accent)" title="Planetary hour" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 14,
          border: "1px solid var(--accent)",
          borderRadius: "var(--r-md)",
          background: "var(--accent-soft)",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "var(--bg-2)",
            border: `1px solid ${LINE_2}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-glyph)",
            color: "var(--accent)",
            fontSize: 24,
            flex: "none",
          }}
          aria-hidden="true"
        >
          {current.g}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Hour now
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1.1 }}>{current.n}</div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-mute)" }}>Day of</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink)" }}>{day}</div>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: "var(--ink-mute)",
          marginBottom: 8,
        }}
      >
        Coming hours
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {next.map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "7px 0",
              borderBottom: i < next.length - 1 ? `1px solid ${LINE}` : "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-glyph)",
                color: "var(--ink-soft)",
                fontSize: 15,
                width: 22,
                textAlign: "center",
                flex: "none",
              }}
              aria-hidden="true"
            >
              {h.glyph}
            </span>
            <span style={{ flex: 1, fontFamily: "var(--font-serif)", fontSize: 14.5, color: "var(--ink-soft)" }}>{h.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-mute)" }}>{h.at}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginTop: 10 }}>
        Approximate · clock hours from local midnight.
      </div>
    </div>
  );
}

function BarbarousCard() {
  const [name, setName] = useState("Ablanathanalba");

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
      <ToolHeading glyph="✶" glyphColor="var(--c-working)" title="Barbarous name" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 74,
          padding: 14,
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          background: "var(--bg-sunk)",
          marginBottom: 14,
          textAlign: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontSize: 25, letterSpacing: "0.04em", color: "var(--accent)", wordBreak: "break-word" }}>
          {name}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => setName(rollBarbarous())}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 9,
            borderRadius: "var(--r-md)",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
          </svg>
          Intone another
        </button>
        <button
          type="button"
          aria-label="Copy"
          onClick={() => navigator.clipboard?.writeText(name).catch(() => undefined)}
          style={{
            width: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 9,
            border: `1px solid ${LINE_2}`,
            borderRadius: "var(--r-md)",
            color: "var(--ink-soft)",
            background: "transparent",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)"; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </button>
      </div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginTop: 10 }}>
        Vocables in the manner of the Greek Magical Papyri — to be vibrated, not translated.
      </div>
    </div>
  );
}

function SortesCard() {
  const [idx, setIdx] = useState(0);
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: "var(--r-lg)", background: "var(--bg-2)", padding: "20px 22px" }}>
      <ToolHeading glyph="☽" glyphColor="var(--c-divination)" title="Sortilege" />
      <div
        style={{
          minHeight: 88,
          padding: "16px 18px",
          border: `1px solid ${LINE}`,
          borderRadius: "var(--r-md)",
          background: "var(--bg-sunk)",
          marginBottom: 14,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)", marginBottom: 7 }}>{SORS_LABELS[idx]}</div>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, lineHeight: 1.45, color: "var(--ink)", margin: 0 }}>
          {ORACLES[idx]}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIdx(Math.floor(Math.random() * ORACLES.length))}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 9,
          border: `1px solid ${LINE_2}`,
          borderRadius: "var(--r-md)",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-soft)",
          background: "transparent",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-3)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-soft)";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
        Cast the lot
      </button>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", marginTop: 10 }}>
        A line drawn at random, after the manner of the <span style={{ fontStyle: "italic" }}>Sortes</span>. Read it
        against your question.
      </div>
    </div>
  );
}

export function Workshop() {
  useTopbar(
    () => ({
      title: "Workshop",
      subtitle: "Builders & quick instruments",
    }),
    [],
  );

  return (
    <main className="scroll" style={{ overflowY: "auto", minHeight: 0, padding: "26px 28px 60px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* Builders */}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 14,
          }}
        >
          Builders
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 38 }}>
          {BUILDERS.map((b) => (
            <BuilderCard key={b.title} {...b} />
          ))}
        </div>

        {/* Quick instruments */}
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-mute)",
            marginBottom: 14,
          }}
        >
          Quick instruments
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <GematriaCard />
          <PlanetaryHourCard />
          <BarbarousCard />
          <SortesCard />
        </div>
      </div>
    </main>
  );
}
