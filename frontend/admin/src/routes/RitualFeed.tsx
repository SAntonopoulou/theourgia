/**
 * Ritual feed — network-of-rites surface.
 *
 * Composition tracks ``Theourgia Ritual Feed.dc.html`` (list view).
 * Calendar view is deferred to a later batch (the scheduler/ICS pipeline
 * lands with it).
 *
 *   Topbar  · "Ritual feed" + subtitle + "Propose ritual" action.
 *   Left    · Featured ritual card · Upcoming list · Past collective log.
 *   Right   · iCal subscribe panel · Times & hours · You're attending ·
 *             Hub members.
 *
 * All content is illustrative until the federation + RSVP endpoints
 * land. Local state covers the RSVP toggles so the UI moves correctly.
 */

import { useTopbar } from "@theourgia/shared";
import { useState } from "react";

// ─── Action ────────────────────────────────────────────────────────────────

function ProposeRitualButton() {
  return (
    <button
      type="button"
      disabled
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: "var(--r-md, 8px)",
        background: "var(--accent)",
        color: "var(--accent-ink, white)",
        fontFamily: "var(--font-ui)",
        fontWeight: 700,
        fontSize: 13.5,
        border: "none",
        cursor: "not-allowed",
        opacity: 0.7,
      }}
      title="Propose lights up with the federation publish endpoint."
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      Propose ritual
    </button>
  );
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

const railLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ink-mute)",
};

// ─── Featured ritual card ───────────────────────────────────────────────────

type Rsvp = "going" | "maybe" | "no" | null;

function rsvpButtonStyle(selected: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 6px",
    border: `1px solid ${selected ? "var(--accent)" : "var(--line-2)"}`,
    borderRadius: "var(--r-md, 8px)",
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    color: selected ? "var(--ink)" : "var(--ink-soft)",
    background: selected ? "var(--accent-soft)" : "transparent",
    cursor: "pointer",
  };
}

function FeaturedRitual({
  rsvp,
  setRsvp,
}: {
  rsvp: Rsvp;
  setRsvp: (r: Rsvp) => void;
}) {
  return (
    <article
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-lg, 14px)",
        overflow: "hidden",
        background: "var(--bg-2)",
        marginBottom: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 18,
          padding: "22px 24px",
          borderBottom: "1px solid var(--line)",
          flexWrap: "wrap",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 74,
            height: 74,
            borderRadius: "var(--r-md, 8px)",
            background: "var(--accent-soft)",
            border: "1px solid var(--line-2)",
            flex: "none",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            Sat
          </span>
          <span
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 30,
              lineHeight: 1,
              color: "var(--ink)",
            }}
          >
            21
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--ink-mute)" }}>
            June
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 5,
            }}
          >
            Solstice · group invocation
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 25,
              lineHeight: 1.1,
              margin: "0 0 9px",
            }}
          >
            Solstice Vigil — Invocation of Helios
          </h2>
          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-soft)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-mute)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              20:12 <span style={{ color: "var(--ink-mute)" }}>your time · 22:12 host</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                aria-hidden="true"
                style={{ fontFamily: "var(--font-glyph, var(--font-serif))", color: "var(--accent)" }}
              >
                ☉
              </span>
              Hour of the Sun
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-mute)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s7-5.5 7-11a7 7 0 0 0-14 0c0 5.5 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              Remote · in unison
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 26, padding: "20px 24px", flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 280px", minWidth: 0 }}>
          <div style={{ ...sectionLabel, marginBottom: 9 }}>Order of service</div>
          <ol
            style={{
              margin: "0 0 18px",
              paddingLeft: 20,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontFamily: "var(--font-serif)",
              fontSize: 14.5,
              color: "var(--ink-soft)",
              lineHeight: 1.4,
            }}
          >
            <li>Banishing — Lesser Ritual of the Pentagram</li>
            <li>The Bornless preliminary invocation</li>
            <li>Orphic Hymn to Helios, sung in unison</li>
            <li>Silent contemplation at the moment of zenith</li>
          </ol>
          <div style={{ ...sectionLabel, marginBottom: 9 }}>Bring</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {["Solar water", "Laurel", "Frankincense", "Gold candle"].map((item) => (
              <span
                key={item}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  padding: "4px 11px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-pill, 999px)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ ...sectionLabel, marginBottom: 11 }}>14 going · 6 maybe</div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            {[
              { ch: "Θ", first: true },
              { ch: "✠", first: false },
              { ch: "Δ", first: false },
              { ch: "Φ", first: false },
            ].map((a) => (
              <span
                key={a.ch}
                aria-hidden="true"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--accent-soft)",
                  border: "1px solid var(--bg-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display, var(--font-serif))",
                  color: "var(--accent)",
                  fontSize: 14,
                  marginLeft: a.first ? 0 : -9,
                }}
              >
                {a.ch}
              </span>
            ))}
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--bg-3)",
                border: "1px solid var(--bg-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-soft)",
                fontSize: 11,
                marginLeft: -9,
              }}
            >
              +10
            </span>
          </div>
          <div style={{ ...sectionLabel, marginBottom: 8 }}>Your reply</div>
          <div
            role="group"
            aria-label="RSVP"
            style={{ display: "flex", gap: 6, marginBottom: 12 }}
          >
            <button
              type="button"
              data-rsvp
              aria-pressed={rsvp === "going"}
              onClick={() => setRsvp(rsvp === "going" ? null : "going")}
              style={rsvpButtonStyle(rsvp === "going")}
            >
              Going
            </button>
            <button
              type="button"
              data-rsvp
              aria-pressed={rsvp === "maybe"}
              onClick={() => setRsvp(rsvp === "maybe" ? null : "maybe")}
              style={rsvpButtonStyle(rsvp === "maybe")}
            >
              Maybe
            </button>
            <button
              type="button"
              data-rsvp
              aria-pressed={rsvp === "no"}
              onClick={() => setRsvp(rsvp === "no" ? null : "no")}
              style={rsvpButtonStyle(rsvp === "no")}
            >
              Can't
            </button>
          </div>
          <button
            type="button"
            disabled
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "not-allowed",
              opacity: 0.7,
            }}
            title="Detail thread ships with the federation surface."
          >
            Full script &amp; thread →
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Upcoming row ───────────────────────────────────────────────────────────

interface UpcomingItem {
  id: string;
  weekday: string;
  day: string;
  title: string;
  time: string;
  hourGlyph: string;
  hourName: string;
  venue: string;
  going: number;
}

const UPCOMING: UpcomingItem[] = [
  {
    id: "darkmoon-26",
    weekday: "Thu",
    day: "26",
    title: "Dark Moon Banishing — LBRP in unison",
    time: "23:00 your time",
    hourGlyph: "♄",
    hourName: "Hour of Saturn",
    venue: "Sub Rosā Lodge",
    going: 8,
  },
  {
    id: "gnostic-29",
    weekday: "Sun",
    day: "29",
    title: "Gnostic Mass — open celebration",
    time: "18:00 your time",
    hourGlyph: "♀",
    hourName: "Hour of Venus",
    venue: "Isis-Urania · in person",
    going: 22,
  },
  {
    id: "geo-1",
    weekday: "Tue",
    day: "1",
    title: "Geomancy circle — collective divination",
    time: "19:30 your time",
    hourGlyph: "☿",
    hourName: "Hour of Mercury",
    venue: "Ordo Theurgica",
    going: 5,
  },
];

function UpcomingRow({
  item,
  going,
  setGoing,
}: {
  item: UpcomingItem;
  going: boolean;
  setGoing: (next: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "16px 18px",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        alignItems: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 50,
          flex: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            textTransform: "uppercase",
            color: "var(--ink-mute)",
          }}
        >
          {item.weekday}
        </span>
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 24,
            lineHeight: 1.1,
          }}
        >
          {item.day}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-display, var(--font-serif))",
            fontSize: 18,
            marginBottom: 3,
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          <span>{item.time}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span
              aria-hidden="true"
              style={{ fontFamily: "var(--font-glyph, var(--font-serif))", color: "var(--accent)" }}
            >
              {item.hourGlyph}
            </span>
            {item.hourName}
          </span>
          <span>{item.venue}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--ink-mute)",
          }}
        >
          {item.going + (going ? 1 : 0)} going
        </span>
        <button
          type="button"
          data-rsvp
          aria-pressed={going}
          onClick={() => setGoing(!going)}
          style={{
            padding: "7px 14px",
            border: `1px solid ${going ? "var(--accent)" : "var(--line-2)"}`,
            borderRadius: "var(--r-md, 8px)",
            background: going ? "var(--accent-soft)" : "transparent",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            color: going ? "var(--ink)" : "var(--ink-soft)",
            cursor: "pointer",
          }}
        >
          {going ? "Going" : "RSVP"}
        </button>
      </div>
    </div>
  );
}

// ─── Past collective log ────────────────────────────────────────────────────

function PastCollectiveLog() {
  const comments = [
    {
      author: "Theophrastos",
      glyph: "Θ",
      text:
        "The fire took on the third attempt. A clear shift at the circumambulation — the group breath synchronised without a cue.",
    },
    {
      author: "Frater Sub Rosā",
      glyph: "✠",
      text:
        "Concur on the shift. I marked 22:47 — the flame leaned inward against the wind. Worth noting for next year's timing.",
    },
    {
      author: "Demetra",
      glyph: "Δ",
      text:
        "Photographed the ash pattern — uploaded to the shared record. The spiral is unmistakable.",
    },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg, 14px)",
        background: "var(--bg-2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "16px 20px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 46,
            flex: "none",
            opacity: 0.7,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              textTransform: "uppercase",
              color: "var(--ink-mute)",
            }}
          >
            Fri
          </span>
          <span
            style={{
              fontFamily: "var(--font-display, var(--font-serif))",
              fontSize: 22,
              lineHeight: 1.1,
              color: "var(--ink-soft)",
            }}
          >
            1
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--ink-mute)" }}>
            May
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontFamily: "var(--font-display, var(--font-serif))", fontSize: 19 }}
          >
            Beltane Fire Working
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)" }}>
            6 participants · notes merged into one record
          </div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--success, var(--c-synchronicity))",
            padding: "3px 10px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-pill, 999px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: "none",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 6.5" />
          </svg>
          Completed
        </span>
      </div>
      <div style={{ padding: "8px 20px 16px" }}>
        {comments.map((c, i) => (
          <div
            key={c.author}
            style={{
              display: "flex",
              gap: 13,
              padding: "13px 0",
              borderBottom: i < comments.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent-soft)",
                border: "1px solid var(--line-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display, var(--font-serif))",
                color: "var(--accent)",
                fontSize: 13,
                flex: "none",
              }}
            >
              {c.glyph}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--ink-mute)",
                  marginBottom: 3,
                }}
              >
                {c.author}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  color: "var(--ink-soft)",
                  lineHeight: 1.5,
                }}
              >
                {c.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Right rail ─────────────────────────────────────────────────────────────

const railCardStyle: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-lg, 14px)",
  padding: "18px 20px",
};

function ICalCard() {
  return (
    <article style={railCardStyle}>
      <div style={{ ...railLabel, marginBottom: 12 }}>Subscribe in your calendar</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 74,
            height: 74,
            borderRadius: "var(--r-md, 8px)",
            background: "#fff",
            padding: 7,
            flex: "none",
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
            gap: "1.5px",
          }}
        >
          {/* deterministic checkerboard, stand-in for a real QR */}
          {Array.from({ length: 49 }, (_, i) => {
            const filled = ((i * 11 + 7) & 1) === 0;
            return (
              <span
                key={`q-${i}`}
                style={{ background: filled ? "#15120D" : "transparent" }}
              />
            );
          })}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--ink-soft)",
              margin: "0 0 10px",
            }}
          >
            Scan, or copy the feed link. Updates sync automatically.
          </p>
          <button
            type="button"
            disabled
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--accent)",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "not-allowed",
              opacity: 0.7,
            }}
            title="ICS feed wires up with the federation surface."
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            Copy iCal link
          </button>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 11px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md, 8px)",
          background: "var(--bg)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--ink-mute)",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          webcal://theourgia.net/o/ordo-theurgica.ics
        </span>
      </div>
    </article>
  );
}

function TimesCard() {
  return (
    <article style={railCardStyle}>
      <div style={{ ...railLabel, marginBottom: 11 }}>Times &amp; hours</div>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink-soft)",
          margin: "0 0 10px",
        }}
      >
        Shown in <span style={{ color: "var(--ink)" }}>your local time</span>. Planetary hours
        computed for your location.
      </p>
    </article>
  );
}

function YourRsvpsCard({ items }: { items: { name: string; meta: string; glyph: string }[] }) {
  if (items.length === 0) return null;
  return (
    <article style={railCardStyle}>
      <div style={{ ...railLabel, marginBottom: 13 }}>You're attending</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-glyph, var(--font-serif))",
                color: "var(--accent)",
                fontSize: 14,
                flex: "none",
              }}
            >
              {item.glyph}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 14.5,
                  lineHeight: 1.2,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--ink-mute)",
                }}
              >
                {item.meta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function HubMembersCard() {
  return (
    <article style={railCardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 13,
        }}
      >
        <span style={railLabel}>Hub members</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-mute)",
          }}
        >
          47
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {["Θ", "✠", "Δ", "Φ", "Ω"].map((ch, i) => (
          <span
            key={ch}
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              border: "1px solid var(--bg-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display, var(--font-serif))",
              color: "var(--accent)",
              fontSize: 13,
              marginLeft: i === 0 ? 0 : -8,
            }}
          >
            {ch}
          </span>
        ))}
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--bg-3)",
            border: "1px solid var(--bg-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-soft)",
            fontSize: 10.5,
            marginLeft: -8,
          }}
        >
          +42
        </span>
      </div>
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function RitualFeed() {
  const [rsvp, setRsvp] = useState<Rsvp>(null);
  const [going, setGoing] = useState<Record<string, boolean>>({
    "darkmoon-26": false,
    "gnostic-29": true,
    "geo-1": false,
  });

  useTopbar(
    () => ({
      title: "Ritual feed",
      subtitle: "Open practice across the network · scripts, times, RSVPs",
      after: <ProposeRitualButton />,
    }),
    [],
  );

  const yourRsvps: { name: string; meta: string; glyph: string }[] = [];
  if (rsvp === "going")
    yourRsvps.push({ name: "Solstice Vigil", meta: "Sat 21 · 20:12", glyph: "☉" });
  if (going["gnostic-29"])
    yourRsvps.push({ name: "Gnostic Mass", meta: "Sun 29 · 18:00", glyph: "♀" });
  if (going["darkmoon-26"])
    yourRsvps.push({ name: "Dark Moon Banishing", meta: "Thu 26 · 23:00", glyph: "♄" });
  if (going["geo-1"])
    yourRsvps.push({ name: "Geomancy circle", meta: "Tue 1 · 19:30", glyph: "☿" });

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: 24,
      }}
    >
      <div style={{ flex: "3 1 480px", minWidth: 0 }}>
        <div style={{ ...sectionLabel, marginBottom: 12 }}>Next · in 1 day</div>
        <FeaturedRitual rsvp={rsvp} setRsvp={setRsvp} />

        <div style={{ ...sectionLabel, marginBottom: 12 }}>Upcoming</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 30 }}>
          {UPCOMING.map((item) => (
            <UpcomingRow
              key={item.id}
              item={item}
              going={!!going[item.id]}
              setGoing={(next) => setGoing((prev) => ({ ...prev, [item.id]: next }))}
            />
          ))}
        </div>

        <div style={{ ...sectionLabel, marginBottom: 12 }}>Past · collective log</div>
        <PastCollectiveLog />
      </div>

      <aside
        style={{
          flex: "1 1 280px",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <ICalCard />
        <TimesCard />
        <YourRsvpsCard items={yourRsvps} />
        <HubMembersCard />
      </aside>
    </div>
  );
}
